(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const builtIn = [
    {id: 'temple-darshan', title: {hi: 'मंदिर दर्शन', en: 'Temple Darshan'}, date: ''},
    {id: 'meetings', title: {hi: 'बैठकें', en: 'Meetings'}, date: ''},
    {id: 'special-events', title: {hi: 'विशेष कार्यक्रम', en: 'Special Events'}, date: ''}
  ];
  let state = {donations: [], expenses: [], gallery: [], albums: builtIn, library: {sample: false}};
  let pending = null, lastLoaded = 0;
  const listeners = new Set();
  const notify = () => { for (const callback of listeners) callback(clone(state)); };
  const notice = document.getElementById('extras-notice');
  async function refresh(force = false) {
    if (pending) return pending;
    if (!force && Date.now() - lastLoaded < 60000) return clone(state);
    pending = (async () => {
      try {
        const [extras, donations, gallery] = await Promise.all([
          window.TempleBackend.api('/api/extras'),
          window.TempleBackend.api('/api/donations'),
          window.TempleBackend.api('/api/gallery')
        ]);
        if (!extras?.data || !Array.isArray(extras.data.expenses) || !Array.isArray(extras.data.albums)
          || !Array.isArray(donations.records) || !Array.isArray(gallery.photos)) throw new Error('Incomplete public data');
        const selected = extras.data.photoAlbums || {};
        state = {
          donations: donations.records,
          expenses: extras.data.expenses,
          albums: extras.data.albums,
          library: {...extras.data.library, sample: false},
          gallery: gallery.photos.map(photo => ({...photo, albumId: selected[photo.id] || 'temple-darshan'}))
        };
        lastLoaded = Date.now();
        notice.hidden = true;
        notify();
        return clone(state);
      } catch (error) {
        notice.hidden = false;
        notice.textContent = document.documentElement.lang === 'en'
          ? 'The donation, expense, gallery or library list could not be updated. Please try again shortly.'
          : 'दान, खर्च, गैलरी या पुस्तकालय की सूची अपडेट नहीं हो सकी। कृपया कुछ देर बाद फिर कोशिश करें।';
        throw error;
      } finally { pending = null; }
    })();
    return pending;
  }
  window.TempleSiteStore = Object.freeze({getState: () => clone(state), subscribe(callback) {
    listeners.add(callback); return () => listeners.delete(callback);
  }, refresh});
  window.refreshTemplePublishedExtras = refresh;
  window.addEventListener('temple-language-change', () => {
    if (!notice.hidden) notice.textContent = document.documentElement.lang === 'en'
      ? 'The donation, expense, gallery or library list could not be updated. Please try again shortly.'
      : 'दान, खर्च, गैलरी या पुस्तकालय की सूची अपडेट नहीं हो सकी। कृपया कुछ देर बाद फिर कोशिश करें।';
  });
  window.addEventListener('focus', () => { refresh().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
  window.setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 60000);
  refresh().catch(() => {});
})();
