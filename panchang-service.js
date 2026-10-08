(() => {
  'use strict';
  const endpoint = 'https://jagannatha-hora-359167915530.europe-west1.run.app/panchang';
  const point = window.TEMPLE_CONFIG?.panchang || { latitude: 27.2021, longitude: 73.7331, place: 'Nagaur' };
  const cacheKey = 'kalka-panchang-v1:' + point.latitude + ':' + point.longitude;
  const maxAge = 6 * 60 * 60 * 1000;
  const elements = Object.fromEntries(['data', 'tithi', 'tithi-end', 'paksha', 'nakshatra', 'nakshatra-end', 'status', 'retry'].map(key => [key, document.getElementById('panchang-' + key)]));
  if (Object.values(elements).some(element => !element)) return;

  // These tables translate API identifiers; no date-specific Panchang is hardcoded.
  const tithis = {
    hi: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा'],
    en: ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima']
  };
  const nakshatras = {
    hi: ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाती', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वाभाद्रपद', 'उत्तराभाद्रपद', 'रेवती'],
    en: ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']
  };
  const messages = {
    loading: 'ऑनलाइन पंचांग लोड हो रहा है…',
    network: 'आज का पंचांग ऑनलाइन अपडेट है।',
    cache: 'आज की सहेजी गई ऑनलाइन जानकारी।',
    offline: 'अभी इंटरनेट से अपडेट नहीं हो सका। आज की सहेजी गई जानकारी दिखाई गई है।',
    error: 'पंचांग लोड नहीं हो सका। इंटरनेट जाँचें और फिर कोशिश करें।'
  };
  const translate = key => window.templeT ? window.templeT(key) : key;
  const dateKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = type => parts.find(value => value.type === type).value;
    return part('year') + '-' + part('month') + '-' + part('day');
  };
  const validEnd = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*\(\+1d\))?$/.test(value);
  const normalize = (response, requestedDate) => {
    const data = response?.panchang;
    if (!data || data.date !== requestedDate || !['Shukla', 'Krishna'].includes(data.paksha)) throw new Error('Wrong Panchang date or paksha');
    if (!Number.isInteger(data.tithi?.number) || data.tithi.number < 1 || data.tithi.number > 30 || !Number.isInteger(data.nakshatra?.number) || data.nakshatra.number < 1 || data.nakshatra.number > 27) throw new Error('Invalid Panchang identifiers');
    if ((data.tithi.number <= 15 ? 'Shukla' : 'Krishna') !== data.paksha) throw new Error('Inconsistent tithi and paksha');
    if (Math.abs(Number(data.place?.latitude) - Number(point.latitude)) > 0.001 || Math.abs(Number(data.place?.longitude) - Number(point.longitude)) > 0.001 || !Number.isFinite(Number(data.place?.latitude)) || !Number.isFinite(Number(data.place?.longitude)) || Number(data.place?.timezone) !== 5.5) throw new Error('Wrong Panchang location');
    if (!validEnd(data.tithi.end) || !validEnd(data.nakshatra.end)) throw new Error('Invalid transition times');
    return { date: data.date, paksha: data.paksha, place: { latitude: Number(point.latitude), longitude: Number(point.longitude), timezone: 5.5 }, tithi: { number: data.tithi.number, end: data.tithi.end }, nakshatra: { number: data.nakshatra.number, end: data.nakshatra.end } };
  };
  const endLabel = (value, language) => {
    const clock = value.slice(0, 5);
    const nextDay = value.includes('(+1d)');
    return language === 'en' ? 'Until ' + clock + (nextDay ? ' · next day' : '') : clock + ' तक' + (nextDay ? ' · अगले दिन' : '');
  };
  let currentDate = '', data = null, fetchedAt = 0, state = 'loading', inFlight = null, lastAttempt = 0;

  const render = () => {
    const language = document.documentElement.lang === 'en' ? 'en' : 'hi';
    elements.data.setAttribute('aria-busy', String(state === 'loading'));
    elements.status.textContent = translate(messages[state]);
    elements.retry.hidden = !['error', 'offline'].includes(state);
    if (!data) {
      for (const key of ['tithi', 'paksha', 'nakshatra']) elements[key].textContent = '—';
      elements['tithi-end'].textContent = elements['nakshatra-end'].textContent = '';
      return;
    }
    elements.tithi.textContent = data.tithi.number === 30 ? (language === 'en' ? 'Amavasya' : 'अमावस्या') : tithis[language][(data.tithi.number - 1) % 15];
    elements.paksha.textContent = language === 'en' ? data.paksha + ' Paksha' : (data.paksha === 'Shukla' ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष');
    elements.nakshatra.textContent = nakshatras[language][data.nakshatra.number - 1];
    elements['tithi-end'].textContent = endLabel(data.tithi.end, language);
    elements['nakshatra-end'].textContent = endLabel(data.nakshatra.end, language);
  };
  const readCache = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey));
      if (!saved || !Number.isFinite(saved.fetchedAt) || saved.fetchedAt <= 0 || saved.fetchedAt > Date.now() + 60000) return;
      const checked = normalize({ panchang: saved.data }, currentDate);
      data = checked; fetchedAt = saved.fetchedAt; state = 'cache';
    } catch { /* Missing, old, blocked or damaged browser storage does not stop live fetching. */ }
  };

  const ensureToday = async ({ force = false } = {}) => {
    window.updateTempleDate?.();
    const today = dateKey();
    if (today !== currentDate) {
      inFlight?.controller.abort();
      inFlight = null; currentDate = today; data = null; fetchedAt = 0; lastAttempt = 0; state = 'loading';
      readCache(); render();
    }
    if (inFlight) return;
    if (!force && ((data && Date.now() - fetchedAt < maxAge) || Date.now() - lastAttempt < 60000)) return;
    lastAttempt = Date.now();
    const request = { date: today, controller: new AbortController() };
    inFlight = request; state = 'loading'; render();
    const timeout = setTimeout(() => request.controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, latitude: point.latitude, longitude: point.longitude, timezone: 5.5, place: point.place || 'Nagaur', ayanamsa_mode: 'LAHIRI' }),
        signal: request.controller.signal
      });
      if (!response.ok) throw new Error('Panchang HTTP ' + response.status);
      const checked = normalize(await response.json(), today);
      // A request from yesterday must never replace today's values after midnight.
      if (currentDate !== today || dateKey() !== today || inFlight !== request) return;
      data = checked; fetchedAt = Date.now(); state = 'network';
      try { localStorage.setItem(cacheKey, JSON.stringify({ data, fetchedAt })); } catch { /* The page also works without storage. */ }
      render();
    } catch {
      if (currentDate === today && dateKey() === today && inFlight === request) { state = data ? 'offline' : 'error'; render(); }
    } finally {
      clearTimeout(timeout);
      if (inFlight === request) inFlight = null;
      if (dateKey() !== currentDate) void ensureToday();
    }
  };
  elements.retry.addEventListener('click', () => { void ensureToday({ force: true }); });
  window.addEventListener('temple-language-change', render);
  window.addEventListener('online', () => { void ensureToday({ force: state === 'error' || state === 'offline' }); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void ensureToday(); });
  // Check IST rollover while the page stays open, including the Gregorian date.
  setInterval(() => { if (!document.hidden) void ensureToday(); }, 30000);
  void ensureToday();
})();
