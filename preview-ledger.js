/* Read-only public donation and expense ledger. */
(() => {
  'use strict';
  const root = document.getElementById('preview-ledger');
  if (!root) return;
  const $ = name => document.getElementById(`preview-ledger-${name}`);
  const PAGE_SIZE = 10;
  const messages = {
    eyebrow: ['सेवा का लेखा', 'A record of service'], title: ['दान एवं खर्च', 'Donations & expenses'],
    description: ['तारीख़ और महीने के अनुसार सेवा का हिसाब।', 'View contributions and expenses by date or month.'],
    donations: ['प्राप्त दान', 'Donations received'], expenses: ['खर्च का विवरण', 'Expense details'],
    period: ['अवधि चुनें', 'Select period'], currentMonth: ['इस महीने', 'This month'],
    chooseMonth: ['महीना चुनें', 'Choose a month'], chooseDate: ['एक तारीख़ चुनें', 'Choose a date'],
    customRange: ['तारीख़ों की अवधि', 'Custom date range'], allDates: ['सभी तारीख़ें', 'All dates'],
    month: ['महीना', 'Month'], date: ['तारीख़', 'Date'], from: ['शुरू की तारीख़', 'From date'], to: ['अंतिम तारीख़', 'To date'],
    reset: ['इस महीने पर लौटें', 'Back to this month'], newest: ['नई प्रविष्टियाँ पहले', 'Newest entries first'],
    entries: ['कुल प्रविष्टियाँ', 'Total entries'], previous: ['पिछला', 'Previous'], next: ['अगला', 'Next'],
    donationsTotal: ['प्राप्त दान की कुल राशि', 'Total donations received'], expensesTotal: ['कुल खर्च', 'Total expenses'],
    donor: ['दानदाता', 'Donor'], amount: ['राशि', 'Amount'], receipt: ['रसीद संख्या', 'Receipt no.'],
    mode: ['माध्यम', 'Mode'], expenseDescription: ['विवरण', 'Description'], anonymous: ['अनाम', 'Anonymous'],
    rangeError: ['शुरू की तारीख़ अंतिम तारीख़ के बाद नहीं हो सकती।', 'The start date must be on or before the end date.'],
    missingDate: ['कृपया सही तारीख़ या महीना चुनें।', 'Please choose a valid date or month.'],
    empty: ['इस अवधि में कोई प्रविष्टि नहीं मिली।', 'There are no entries for this period.'],
    noDonations: ['अभी दान की कोई प्रविष्टि उपलब्ध नहीं है।', 'No donation entries are available yet.'],
    noExpenses: ['अभी खर्च की कोई प्रविष्टि उपलब्ध नहीं है।', 'No expense entries are available yet.'],
    latest: ['नवीनतम प्रविष्टियों वाला महीना देखें', 'View the month with the latest entries'],
    sampleExpenses: ['प्रीव्यू के नमूना खर्च • ये काल्पनिक प्रविष्टियाँ केवल प्रदर्शन के लिए हैं।', 'Preview sample expenses • These fictional entries are for demonstration only.'],
    sampleDonations: ['प्रीव्यू की नमूना सूची • ये काल्पनिक दान हैं; वास्तविक दान सूची अलग है।', 'Preview sample list • These are fictional donations, separate from the actual donation list.'],
    demo: ['नमूना सूची देखें', 'View sample list'], actual: ['वास्तविक दान सूची देखें', 'View actual donations'],
    source: ['सहेजी गई सार्वजनिक दान सूची', 'Saved public donation list'], expenseSource: ['सहेजी गई सार्वजनिक खर्च सूची', 'Saved public expense list'], previewSource: ['केवल इस प्रीव्यू की प्रविष्टियाँ', 'Entries in this preview only'],
    tabLabel: ['लेखे का प्रकार', 'Ledger type'], tableLabel: ['लेखे की प्रविष्टियाँ', 'Ledger entries'],
    cash: ['नकद', 'Cash'], bank: ['बैंक', 'Bank'], cheque: ['चेक', 'Cheque'],
    sampleDonor: ['नमूना दानदाता', 'Sample donor']
  };
  const english = () => document.documentElement.lang === 'en';
  const t = key => messages[key]?.[english() ? 1 : 0] ?? key;
  const locale = () => english() ? 'en-IN' : 'hi-IN';
  const number = value => new Intl.NumberFormat(locale()).format(value);
  const money = value => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value / 100);
  const calendarFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const currentISTDate = () => {
    const parts = Object.fromEntries(calendarFormat.formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  let today = currentISTDate(), thisMonth = today.slice(0, 7);
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const monthBounds = value => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('missingDate');
    const [year, month] = value.split('-').map(Number);
    return [value + '-01', value + '-' + new Date(Date.UTC(year, month, 0)).getUTCDate()];
  };
  const dateLabel = value => new Intl.DateTimeFormat(locale(), { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const monthLabel = value => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T00:00:00Z'));
  let type = 'donations', page = 0, latestMonth = '';
  const manualFields = new Set();
  $('month').value = thisMonth;
  $('date').value = today;
  $('from').value = monthBounds(thisMonth)[0];
  $('to').value = monthBounds(thisMonth)[1];

  function refreshCalendar() {
    const nextToday = currentISTDate();
    if (nextToday === today) return false;
    const previousCurrentMonth = thisMonth;
    today = nextToday;
    thisMonth = today.slice(0, 7);
    const [from, to] = monthBounds(thisMonth);
    for (const [field, value] of [['month', thisMonth], ['date', today], ['from', from], ['to', to]]) {
      if (!manualFields.has(field)) $(field).value = value;
    }
    if ($('period').value === 'current' && previousCurrentMonth !== thisMonth) page = 0;
    return true;
  }

  function selectedBounds() {
    const period = $('period').value;
    if (period === 'current') return monthBounds(thisMonth);
    if (period === 'month') return monthBounds($('month').value);
    if (period === 'date') {
      if (!validDate($('date').value)) throw new Error('missingDate');
      return [$('date').value, $('date').value];
    }
    if (period === 'custom') {
      const from = $('from').value, to = $('to').value;
      if (!validDate(from) || !validDate(to)) throw new Error('missingDate');
      if (from > to) throw new Error('rangeError');
      return [from, to];
    }
    return ['', ''];
  }
  function localMode(mode) {
    const value = String(mode || '').trim();
    if (/^(cash|नकद|नगद)$/i.test(value)) return t('cash');
    if (/^(bank|bank transfer|बैंक)$/i.test(value)) return t('bank');
    if (/^(cheque|check|चेक)$/i.test(value)) return t('cheque');
    return value || '—';
  }
  function sourceRows() {
    const state = window.TempleSiteStore?.getState() || {};
    const rows = state[type];
    return (Array.isArray(rows) ? rows : []).filter(row => row && validDate(row.date) && Number.isSafeInteger(row.amountPaise))
      .slice().sort((a, b) => b.date.localeCompare(a.date));
  }
  function render() {
    refreshCalendar();
    root.querySelectorAll('[data-ledger-text]').forEach(element => { element.textContent = t(element.dataset.ledgerText); });
    $('tabs').setAttribute('aria-label', t('tabLabel'));
    $('table-wrap').setAttribute('aria-label', t('tableLabel'));
    $('content').setAttribute('aria-labelledby', `preview-ledger-${type}`);
    root.querySelectorAll('[data-ledger-type]').forEach(button => {
      const selected = button.dataset.ledgerType === type;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const period = $('period').value;
    for (const field of ['month', 'date', 'from', 'to']) {
      $(field + '-field').hidden = period !== (field === 'from' || field === 'to' ? 'custom' : field);
      $(field).disabled = $(field + '-field').hidden;
    }
    const source = sourceRows();
    latestMonth = source[0]?.date.slice(0, 7) || '';
    const sample = false;
    $('sample').hidden = !sample;
    $('sample').textContent = t(type === 'expenses' ? 'sampleExpenses' : 'sampleDonations');
    $('demo').hidden = true;
    $('source').textContent = t(type === 'expenses' ? 'expenseSource' : 'source');
    $('total-label').textContent = t(type === 'expenses' ? 'expensesTotal' : 'donationsTotal');
    $('table').dataset.type = type;
    $('caption').textContent = t(type);
    const columns = type === 'expenses' ? ['date', 'expenseDescription', 'amount'] : ['date', 'donor', 'amount', 'receipt', 'mode'];
    $('columns').replaceChildren(...columns.map(column => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = t(column); return th;
    }));
    $('rows').replaceChildren();
    $('error').hidden = true;
    let bounds;
    try { bounds = selectedBounds(); }
    catch (error) {
      $('error').textContent = t(error.message); $('error').hidden = false;
      $('total').textContent = '—'; $('count').textContent = '—'; $('period-label').textContent = '';
      $('table-wrap').hidden = true; $('empty').hidden = true; $('pagination').hidden = true;
      return;
    }
    const [from, to] = bounds;
    $('period-label').textContent = period === 'all' ? t('allDates') : ['current', 'month'].includes(period) ? monthLabel(from.slice(0, 7)) : from === to ? dateLabel(from) : `${dateLabel(from)} – ${dateLabel(to)}`;
    const rows = source.filter(row => (!from || row.date >= from) && (!to || row.date <= to));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    page = Math.max(0, Math.min(page, pages - 1));
    $('total').textContent = money(rows.reduce((sum, row) => sum + row.amountPaise, 0));
    $('count').textContent = number(rows.length);
    for (const row of rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const tr = document.createElement('tr');
      const donor = row.donor || t('anonymous');
      const values = type === 'expenses' ? [dateLabel(row.date), english() && row.descriptionEn ? row.descriptionEn : row.description || '—', money(row.amountPaise)] : [dateLabel(row.date), donor, money(row.amountPaise), row.receipt || '—', localMode(row.mode)];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      $('rows').append(tr);
    }
    $('table-wrap').hidden = rows.length === 0;
    $('empty').hidden = rows.length > 0;
    $('empty-text').textContent = t(source.length ? 'empty' : type === 'expenses' ? 'noExpenses' : 'noDonations');
    $('latest').hidden = !source.length || rows.length > 0;
    $('latest').textContent = latestMonth ? `${t('latest')} · ${monthLabel(latestMonth)}` : '';
    $('pagination').hidden = rows.length === 0;
    $('prev').disabled = page === 0;
    $('next').disabled = page >= pages - 1;
    $('page').textContent = english() ? `${number(page + 1)} / ${number(pages)}` : `${number(page + 1)} / ${number(pages)}`;
    const first = rows.length ? page * PAGE_SIZE + 1 : 0, last = Math.min((page + 1) * PAGE_SIZE, rows.length);
    $('range').textContent = english() ? `${number(first)}–${number(last)} of ${number(rows.length)} entries · 10 per page` : `${number(rows.length)} में से ${number(first)}–${number(last)} प्रविष्टियाँ · प्रति पृष्ठ 10`;
  }
  function changeType(value) { type = value; page = 0; render(); }
  $('filters').addEventListener('submit', event => event.preventDefault());
  ['period', 'month', 'date', 'from', 'to'].forEach(name => $(name).addEventListener('change', () => {
    if (name === 'period') {
      const selected = $('period').value;
      if (selected === 'custom') { manualFields.add('from'); manualFields.add('to'); }
      else if (selected === 'month' || selected === 'date') manualFields.add(selected);
    } else manualFields.add(name);
    page = 0; render();
  }));
  root.querySelectorAll('[data-ledger-type]').forEach(button => {
    button.addEventListener('click', () => changeType(button.dataset.ledgerType));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const selectedType = event.key === 'Home' ? 'donations' : event.key === 'End' ? 'expenses' : type === 'donations' ? 'expenses' : 'donations';
      changeType(selectedType); $(selectedType).focus();
    });
  });
  $('reset').addEventListener('click', () => {
    refreshCalendar(); manualFields.clear(); $('period').value = 'current'; $('month').value = thisMonth;
    $('date').value = today; [$('from').value, $('to').value] = monthBounds(thisMonth);
    page = 0; render();
  });
  $('latest').addEventListener('click', () => { if (!latestMonth) return; $('period').value = 'month'; $('month').value = latestMonth; manualFields.add('month'); page = 0; render(); });
  $('prev').addEventListener('click', () => { page--; render(); });
  $('next').addEventListener('click', () => { page++; render(); });
  window.addEventListener('temple-language-change', render);
  window.TempleSiteStore?.subscribe(() => { render(); });
  let rolloverTimer;
  function scheduleRollover() {
    window.clearTimeout(rolloverTimer);
    if (refreshCalendar()) render();
    const nextMidnight = new Date(`${today}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000;
    rolloverTimer = window.setTimeout(scheduleRollover, Math.max(100, nextMidnight - Date.now() + 100));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRollover(); });
  window.addEventListener('focus', scheduleRollover);
  scheduleRollover();
  render();
})();
