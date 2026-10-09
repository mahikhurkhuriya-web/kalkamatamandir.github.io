(() => {
  'use strict';
  const words = {
    galleryEyebrow: ['माता के दरबार की झलकियाँ', 'Glimpses of temple life'],
    galleryTitle: ['फोटो गैलरी', 'Photo gallery'],
    galleryIntro: ['मंदिर दर्शन, बैठकों और विशेष आयोजनों की तस्वीरें अलग-अलग एल्बम में देखें।', 'Explore temple darshan, meetings and special events in their own albums.'],
    albums: ['एल्बम', 'albums'], photos: ['तस्वीरें', 'photos'], photo: ['तस्वीर', 'photo'],
    openAlbum: ['एल्बम देखें', 'View album'], backAlbums: ['सभी एल्बम', 'All albums'],
    albumEmptyTitle: ['इस एल्बम की तस्वीरें जल्द साझा की जाएँगी', 'Photos will be added to this album soon'],
    albumEmptyText: ['तस्वीरें जुड़ने के बाद आप उन्हें यहीं देख सकेंगे।', 'Photos added to this album will appear here.'],
    awaitingPhotos: ['तस्वीरें प्रतीक्षित', 'Photos coming soon'], viewPhoto: ['फोटो देखें', 'View photo'],
    photoUnavailable: ['यह तस्वीर अभी दिखाई नहीं जा सकी', 'This photo could not be displayed'],
    photoTitle: ['मंदिर की तस्वीर', 'Temple photo'], otherAlbum: ['अन्य तस्वीरें', 'More photos'],
    templeDarshan: ['मंदिर दर्शन', 'Temple darshan'], meetings: ['बैठकें', 'Meetings'], specialEvents: ['विशेष आयोजन', 'Special events'],
    backFacilities: ['सुविधाओं पर वापस जाएँ', 'Back to facilities'],
    libraryEyebrow: ['शिक्षा की ओर एक कदम', 'A place to learn and grow'],
    libraryTitle: ['निःशुल्क पुस्तकालय', 'Free library'],
    libraryIntro: ['पढ़ाई, तैयारी और आगे बढ़ने के लिए एक शांत स्थान। वातानुकूलित अध्ययन कक्ष, निःशुल्क Wi-Fi और विशेषज्ञ मार्गदर्शन की सुविधा।', 'A quiet place to study, prepare and grow, with an air-conditioned reading room, free Wi-Fi and expert guidance.'],
    libraryTeaserIntro: ['पढ़ाई और तैयारी के लिए एक शांत स्थान।', 'A quiet place for study and preparation.'],
    libraryFacilities: ['पुस्तकालय की सुविधाएँ', 'Library facilities'],
    ac: ['वातानुकूलित कक्ष', 'Air-conditioned room'], wifi: ['निःशुल्क Wi-Fi', 'Free Wi-Fi'], guidance: ['विशेषज्ञ मार्गदर्शन', 'Expert guidance'],
    libraryArtCaption: ['ज्ञान • अध्ययन • प्रगति', 'Knowledge • Study • Progress'],
    exploreLibrary: ['पूरी जानकारी देखें', 'View full details'],
    seatEyebrow: ['अध्ययन की जगह', 'Space to study'], seatTitle: ['सीटों की उपलब्धता', 'Seat availability'],
    sampleBadge: ['नमूना आँकड़े', 'Sample figures'],
    sampleNote: ['ये केवल नमूना आँकड़े हैं। वास्तविक सीटों की उपलब्धता की जानकारी जल्द साझा की जाएगी।', 'These are sample figures only. Actual seat availability will be shared soon.'],
    totalSeats: ['कुल सीटें', 'Total seats'], allocatedSeats: ['आवंटित सीटें', 'Allocated'], freeSeats: ['खाली सीटें', 'Available'], waitingSeats: ['प्रतीक्षा सूची', 'Waiting list'],
    noUpdate: ['अपडेट समय दर्ज नहीं है।', 'Update time has not been recorded.'], updated: ['अंतिम अपडेट', 'Last updated'], sampleUpdated: ['नमूना अपडेट', 'Sample updated'],
    libraryDetails: ['जानकारी एवं संपर्क', 'Information & contact'], libraryName: ['पुस्तकालय का नाम', 'Library name'],
    libraryHours: ['खुलने का समय', 'Opening hours'], libraryAddress: ['पता', 'Address'], libraryContact: ['संपर्क व्यक्ति', 'Contact person'], libraryPhone: ['संपर्क नंबर', 'Phone number'],
    beforeVisit: ['आने से पहले', 'Before your visit'], admissionTitle: ['प्रवेश प्रक्रिया', 'Admission process'], rulesTitle: ['पुस्तकालय के नियम', 'Library rules'],
    notFilled: ['जानकारी जल्द साझा की जाएगी', 'Information will be shared soon']
  };
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'hi';
  const t = key => words[key]?.[language() === 'en' ? 1 : 0] || key;
  const localize = value => typeof value === 'string' ? value.trim() : String(value?.[language()] || value?.hi || value?.en || '').trim();
  const state = () => window.TempleSiteStore?.getState() || {};
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const imageUrl = photo => {
    const raw = photo?.url || photo?.imageUrl;
    if (!raw || typeof raw !== 'string') return '';
    let resolved;
    try { resolved = window.TempleBackend?.imageUrl(raw) || raw; } catch { return ''; }
    if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(resolved)) return resolved;
    if (/^blob:/.test(resolved)) return resolved;
    try {
      const url = new URL(resolved, location.href);
      return url.protocol === 'https:' || (url.origin === location.origin && ['http:', 'file:'].includes(url.protocol)) ? url.href : '';
    } catch { return ''; }
  };
  const photoTitle = photo => localize(language() === 'en' && photo.titleEn ? photo.titleEn : photo.title) || t('photoTitle');
  const formatDate = (value, withTime = false) => {
    if (!value) return '';
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00+05:30' : value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(language() === 'en' ? 'en-IN' : 'hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date);
  };
  let activeAlbum = null;
  let viewedPhotoId = null;
  const photos = () => (state().gallery || []).filter(photo => imageUrl(photo));
  const albumIdFor = photo => photo.albumId || 'temple-darshan';
  const albums = () => {
    const builtIn = [
      { id: 'temple-darshan', title: { hi: words.templeDarshan[0], en: words.templeDarshan[1] } },
      { id: 'meetings', title: { hi: words.meetings[0], en: words.meetings[1] } },
      { id: 'special-events', title: { hi: words.specialEvents[0], en: words.specialEvents[1] } }
    ];
    const byId = new Map(builtIn.map(album => [album.id, album]));
    for (const album of state().albums || []) if (album?.id) byId.set(album.id, { ...byId.get(album.id), ...album });
    for (const photo of photos()) if (!byId.has(albumIdFor(photo))) byId.set(albumIdFor(photo), { id: albumIdFor(photo), title: { hi: words.otherAlbum[0], en: words.otherAlbum[1] } });
    return [...byId.values()];
  };
  const countLabel = count => count + ' ' + t(count === 1 ? 'photo' : 'photos');
  const iconPaths = {
    'temple-darshan': '<path d="M22 72h76M30 72V42h60v30M41 42l19-27 19 27M50 72V55h20v17M25 42h70M60 15V7m0 0 14 4-14 4M35 85h50"/>',
    meetings: '<circle cx="60" cy="30" r="10"/><circle cx="31" cy="41" r="8"/><circle cx="89" cy="41" r="8"/><path d="M42 62v-6c0-11 36-11 36 0v6M15 64v-6c0-10 18-14 28-6m62 12v-6c0-10-18-14-28-6M20 72h80M31 72v17m58-17v17M46 85h28"/>',
    'special-events': '<path d="M30 27h60v56H30zM30 43h60M44 20v14m32-14v14m-16 18 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1 4-9ZM19 34l-6-4m88 4 6-4M22 64h-9m85 0h9"/>',
    default: '<rect x="27" y="26" width="66" height="55" rx="4"/><path d="m27 70 20-21 17 16 11-10 18 21M36 88h49"/><circle cx="74" cy="41" r="6"/>'
  };
  const artwork = id => {
    const wrap = make('div', 'album-artwork album-artwork-' + (Object.hasOwn(iconPaths, id) ? id : 'default'));
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '<svg viewBox="0 0 120 100" fill="none" focusable="false">' + (Object.hasOwn(iconPaths, id) ? iconPaths[id] : iconPaths.default) + '</svg>';
    wrap.append(make('span', 'album-artwork-label', t('awaitingPhotos')));
    return wrap;
  };
  const openPhoto = photo => {
    const dialog = document.getElementById('photo-dialog');
    const image = document.getElementById('large-photo');
    const url = imageUrl(photo);
    if (!dialog || !image || !url) return;
    viewedPhotoId = photo.id;
    image.src = url;
    image.alt = photoTitle(photo);
    document.getElementById('large-photo-title').textContent = image.alt;
    if (!dialog.open) dialog.showModal();
  };
  function renderGallery() {
    const host = document.querySelector('#gallery .container');
    if (!host) return;
    const allAlbums = albums();
    const allPhotos = photos();
    const selected = allAlbums.find(album => album.id === activeAlbum);
    if (!selected) activeAlbum = null;
    const heading = make('div', 'section-heading community-gallery-heading');
    const headingCopy = make('div');
    headingCopy.append(make('p', 'eyebrow', t('galleryEyebrow')));
    const title = make('h2', '', selected ? localize(selected.title) : t('galleryTitle'));
    title.id = 'gallery-title'; title.tabIndex = -1;
    headingCopy.append(title);
    heading.append(headingCopy);
    const visiblePhotos = selected ? allPhotos.filter(photo => albumIdFor(photo) === selected.id) : allPhotos;
    heading.append(make('span', 'community-gallery-count', selected ? countLabel(visiblePhotos.length) : allAlbums.length + ' ' + t('albums') + ' · ' + countLabel(allPhotos.length)));
    const elements = [];
    if (selected) {
      const back = make('button', 'community-back', '← ' + t('backAlbums'));
      back.type = 'button';
      back.addEventListener('click', () => {
        const previous = activeAlbum; activeAlbum = null; renderGallery();
        [...host.querySelectorAll('[data-album-id]')].find(button => button.dataset.albumId === previous)?.focus();
      });
      elements.push(back);
    }
    elements.push(heading);
    if (!selected) elements.push(make('p', 'community-gallery-intro', t('galleryIntro')));
    else if (formatDate(selected.date)) elements.push(make('p', 'community-gallery-intro', formatDate(selected.date)));
    if (!selected) {
      const grid = make('div', 'album-grid');
      for (const album of allAlbums) {
        const albumPhotos = allPhotos.filter(photo => albumIdFor(photo) === album.id);
        const card = make('button', 'album-card'); card.type = 'button'; card.dataset.albumId = album.id;
        const albumTitle = localize(album.title) || t('otherAlbum');
        card.setAttribute('aria-label', albumTitle + ' — ' + countLabel(albumPhotos.length) + ' — ' + t('openAlbum'));
        const media = make('div', 'album-media');
        if (albumPhotos.length) {
          const cover = make('img'); cover.src = imageUrl(albumPhotos[0]); cover.alt = ''; cover.loading = 'lazy'; cover.width = 640; cover.height = 400;
          cover.addEventListener('error', () => { media.replaceChildren(artwork(album.id)); media.querySelector('.album-artwork-label').textContent = t('photoUnavailable'); }, { once: true });
          media.append(cover);
        } else media.append(artwork(album.id));
        const copy = make('div', 'album-copy');
        copy.append(make('span', 'album-photo-count', countLabel(albumPhotos.length)), make('h3', '', albumTitle));
        if (formatDate(album.date)) copy.append(make('span', 'album-date', formatDate(album.date)));
        copy.append(make('span', 'album-open', t('openAlbum') + ' →'));
        card.append(media, copy);
        card.addEventListener('click', () => { activeAlbum = album.id; renderGallery(); document.getElementById('gallery-title')?.focus({ preventScroll: true }); });
        grid.append(card);
      }
      elements.push(grid);
    } else if (visiblePhotos.length) {
      const grid = make('div', 'gallery-grid community-photo-grid'); grid.id = 'gallery-grid';
      for (const photo of visiblePhotos) {
        const title = photoTitle(photo);
        const card = make('button', 'gallery-card community-photo-card'); card.type = 'button';
        card.setAttribute('aria-label', title + ' — ' + t('viewPhoto'));
        const image = make('img'); image.src = imageUrl(photo); image.alt = title; image.loading = 'lazy'; image.width = 600; image.height = 450;
        image.addEventListener('error', () => {
          const missing = make('div', 'community-missing-photo', t('photoUnavailable'));
          image.replaceWith(missing); card.disabled = true;
        }, { once: true });
        const caption = make('span', 'community-photo-caption', title);
        const date = formatDate(photo.eventDate);
        if (date) caption.append(make('small', '', date));
        card.append(image, caption); card.addEventListener('click', () => openPhoto(photo)); grid.append(card);
      }
      elements.push(grid);
    } else {
      const empty = make('div', 'community-album-empty');
      empty.append(artwork(selected.id));
      const copy = make('div'); copy.append(make('h3', '', t('albumEmptyTitle')), make('p', '', t('albumEmptyText')));
      empty.append(copy); elements.push(empty);
    }
    host.replaceChildren(...elements);
    const dialog = document.getElementById('photo-dialog');
    if (dialog?.open && viewedPhotoId != null) {
      const current = allPhotos.find(photo => photo.id === viewedPhotoId);
      if (current) openPhoto(current); else dialog.close();
    }
  }
  function renderLibrary() {
    document.querySelectorAll('[data-community-i18n]').forEach(element => { element.textContent = t(element.dataset.communityI18n); });
    document.querySelectorAll('[data-community-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.communityLabel)); });
    if (!document.getElementById('library')) return;
    const library = state().library || {};
    for (const [id, key] of [['library-name', 'name'], ['library-hours', 'hours'], ['library-address', 'address'], ['library-contact-name', 'contactName'], ['library-admission', 'admission'], ['library-rules', 'rules']]) {
      const element = document.getElementById(id);
      const value = localize(library[key]);
      element.textContent = value || t('notFilled'); element.classList.toggle('library-unfilled', !value);
    }
    const phone = String(library.phone || '').trim();
    const digits = phone.replace(/[^+\d]/g, '');
    const phoneHost = document.getElementById('library-phone'); phoneHost.replaceChildren();
    if (/^\+?\d{7,15}$/.test(digits)) {
      const link = make('a', '', phone); link.href = 'tel:' + digits; phoneHost.append(link); phoneHost.classList.remove('library-unfilled');
    } else { phoneHost.textContent = t('notFilled'); phoneHost.classList.add('library-unfilled'); }
    const sample = library.sample !== false;
    const count = (value, fallback) => Number.isInteger(Number(value)) && Number(value) >= 0 && value !== '' && value != null ? Number(value) : sample ? fallback : null;
    const total = count(library.totalSeats, 40), allocated = count(library.allocatedSeats, 32), waiting = count(library.waiting, 5);
    const free = total == null || allocated == null ? null : Math.max(0, total - allocated);
    for (const [id, value] of [['library-total-seats', total], ['library-allocated-seats', allocated], ['library-free-seats', free], ['library-waiting-seats', waiting]]) document.getElementById(id).textContent = value == null ? '—' : String(value);
    document.getElementById('library-sample-badge').hidden = !sample;
    document.getElementById('library-sample-note').hidden = !sample;
    const updated = formatDate(library.updatedAt, true);
    document.getElementById('library-updated').textContent = updated ? t(sample ? 'sampleUpdated' : 'updated') + ': ' + updated + ' (IST)' : t('noUpdate');
    if (location.hash === '#library' && !document.getElementById('library').hidden) {
      const base = localize(window.TEMPLE_CMS_SETTINGS?.branding?.pageTitle) || localize(window.TEMPLE_CONFIG?.name);
      if (base) document.title = t('libraryTitle') + ' · ' + base;
    }
  }
  function renderTeaser() {
    const container = document.querySelector('#facilities .container');
    if (!container) return;
    let teaser = document.getElementById('library-teaser');
    if (!teaser) { teaser = make('article', 'library-teaser'); teaser.id = 'library-teaser'; container.append(teaser); }
    const symbol = make('span', 'library-teaser-icon'); symbol.setAttribute('aria-hidden', 'true');
    symbol.innerHTML = '<svg viewBox="0 0 60 60" fill="none"><path d="M30 17c-8-5-15-6-23-4v30c8-2 15-1 23 4 8-5 15-6 23-4V13c-8-2-15-1-23 4ZM30 17v30M14 21c3 0 6 1 10 3M14 28c3 0 6 1 10 3M37 24c4-2 7-3 10-3M37 31c4-2 7-3 10-3"/></svg>';
    const copy = make('div', 'library-teaser-copy'); copy.append(make('p', 'eyebrow', t('libraryEyebrow')), make('h3', '', t('libraryTitle')), make('p', '', t('libraryTeaserIntro')));
    const amenities = make('div', 'library-teaser-amenities');
    for (const key of ['ac', 'wifi', 'guidance']) amenities.append(make('span', '', t(key)));
    copy.append(amenities);
    const link = make('a', 'button button-secondary', t('exploreLibrary') + ' →'); link.href = '#library';
    teaser.replaceChildren(symbol, copy, link);
  }
  const render = () => { renderGallery(); renderTeaser(); renderLibrary(); };
  window.getTempleGalleryPhotos = photos;
  window.renderTempleGallery = renderGallery;
  window.refreshTemplePublishedGallery = async () => renderGallery();
  window.addEventListener('temple-language-change', render);
  window.TempleSiteStore?.subscribe(render);
  document.getElementById('photo-dialog')?.addEventListener('close', () => { viewedPhotoId = null; });
  render();
})();
