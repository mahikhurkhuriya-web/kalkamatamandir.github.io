export const fields = ['date', 'donor', 'amount', 'receipt', 'mode', 'note'];
const aliases = {
  date: ['date', 'donationdate', 'receiveddate', 'तारीख', 'तारीख़', 'दिनांक', 'दानदिनांक'],
  donor: ['donor', 'name', 'donorname', 'दानदाता', 'नाम', 'दानदाताकानाम', 'यजमान'],
  amount: ['amount', 'amt', 'donationamount', 'राशि', 'दानराशि', 'रकम'],
  receipt: ['receipt', 'receiptno', 'receiptnumber', 'रसीद', 'रसीदसंख्या', 'रसीदनंबर'],
  mode: ['mode', 'paymentmode', 'माध्यम', 'भुगतानमाध्यम'],
  note: ['note', 'notes', 'remarks', 'remark', 'टिप्पणी', 'विवरण']
};
const key = value => String(value ?? '').normalize('NFC').toLowerCase().replace(/[\s_.:()₹/-]/g, '');
export const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number), date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2100 && date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
};
export const dateValue = (value, date1904 = false, sdk = globalThis.XLSX) => {
  let result;
  if (value instanceof Date && Number.isFinite(value.getTime())) result = [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()];
  else if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = sdk?.SSF.parse_date_code(value, { date1904 });
    if (parsed) result = [parsed.y, parsed.m, parsed.d];
  } else {
    const text = String(value ?? '').trim();
    let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(text);
    if (match) result = match.slice(1).map(Number);
    else { match = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text); if (match) result = [Number(match[3]), Number(match[2]), Number(match[1])]; }
  }
  if (!result) throw new Error('तारीख़ DD/MM/YYYY या YYYY-MM-DD में होनी चाहिए।');
  const iso = result[0] + '-' + String(result[1]).padStart(2, '0') + '-' + String(result[2]).padStart(2, '0');
  if (!validDate(iso)) throw new Error('तारीख़ सही नहीं है।');
  return iso;
};
export const amountValue = value => {
  const text = typeof value === 'number' ? value : String(value ?? '').trim().replace(/^(?:INR|Rs\.?|₹)\s*/i, '').replace(/,/g, '');
  if (text === '' || !/^(?:\d+)(?:\.\d+)?$/.test(String(text))) throw new Error('राशि सही संख्या में होनी चाहिए।');
  const amount = Number(text), paise = Math.round(amount * 100);
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > 100000000000 || Math.abs(paise / 100 - amount) > 0.000001) throw new Error('राशि शून्य से अधिक और अधिकतम दो दशमलव में होनी चाहिए।');
  return paise;
};
export const validateRecords = records => {
  if (!Array.isArray(records) || records.length > 2000) throw new Error('एक बार में अधिकतम 2000 प्रविष्टियाँ जोड़ें।');
  return records.map(row => {
    if (!row || typeof row !== 'object' || !validDate(row.date) || !Number.isSafeInteger(row.amountPaise) || row.amountPaise <= 0 || row.amountPaise > 100000000000) throw new Error('दान के विवरण में तारीख़ या राशि सही नहीं है।');
    const result = { date: row.date, amountPaise: row.amountPaise, donor: '', receipt: '', mode: '', note: '' };
    for (const [field, max] of [['donor', 120], ['receipt', 80], ['mode', 40], ['note', 300]]) {
      const text = String(row[field] ?? '').trim(); if (text.length > max) throw new Error('किसी प्रविष्टि का विवरण बहुत लंबा है।'); result[field] = text;
    }
    return result;
  });
};
export const parseRows = (rows, options = {}) => {
  let header = -1, columns;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const candidate = Object.fromEntries(fields.map(field => [field, rows[i].findIndex(value => aliases[field].includes(key(value)))]));
    if (candidate.date >= 0 && candidate.amount >= 0) { header = i; columns = candidate; break; }
  }
  if (header < 0) throw new Error('Excel में Date और Amount कॉलम नहीं मिले। नमूना डाउनलोड करें।');
  const records = [], errors = [];
  for (let index = header + 1; index < rows.length; index++) {
    const values = Object.fromEntries(fields.map(field => [field, columns[field] >= 0 ? rows[index][columns[field]] : '']));
    if (fields.every(field => values[field] == null || String(values[field]).trim() === '')) continue;
    // Ignore a labelled grand-total row; it must not be counted as a donation.
    if (!values.date && /^(?:(?:grand\s+)?total|कुल(?:\s+(?:राशि|योग))?|योग)$/i.test(String(values.donor).trim())) continue;
    try { records.push({ date: dateValue(values.date, options.date1904, options.sdk), amountPaise: amountValue(values.amount), donor: String(values.donor ?? ''), receipt: String(values.receipt ?? ''), mode: String(values.mode ?? ''), note: String(values.note ?? '') }); }
    catch (error) { errors.push({ row: index + 1, message: error.message }); }
  }
  if (errors.length) { const error = new Error('कुछ पंक्तियों में तारीख़ या राशि सही नहीं है।'); error.rows = errors; throw error; }
  if (!records.length) throw new Error('Excel में दान की कोई प्रविष्टि नहीं मिली।');
  return validateRecords(records);
};
export const filterRecords = (records, from = '', to = '') => {
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) throw new Error('शुरू की तारीख़ अंतिम तारीख़ से पहले या बराबर होनी चाहिए।');
  const rows = records.filter(row => (!from || row.date >= from) && (!to || row.date <= to)).sort((a, b) => b.date.localeCompare(a.date));
  return { rows, amountPaise: rows.reduce((total, row) => total + row.amountPaise, 0) };
};
if (typeof window !== 'undefined') window.TempleLedgerData = { validDate, dateValue, amountValue, validateRecords, parseRows, filterRecords };
