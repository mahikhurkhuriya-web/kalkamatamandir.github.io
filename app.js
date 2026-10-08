(() => {
  'use strict';
  const config = window.TEMPLE_CONFIG || {};
  const dictionary = window.TEMPLE_TRANSLATIONS || {};
  const nav = document.getElementById('main-nav');
  const tabs = [...nav.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('main > [role="tabpanel"]')];
  const staticTexts = [], staticAttributes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script,style,[data-language],[data-cms]')) continue;
    const key = node.textContent.trim();
    if (key && Object.prototype.hasOwnProperty.call(dictionary, key)) staticTexts.push({ node, key, before: node.textContent.match(/^\s*/)[0], after: node.textContent.match(/\s*$/)[0] });
  }
  document.querySelectorAll('[aria-label],[alt],[placeholder]').forEach(element => {
    for (const attribute of ['aria-label', 'alt', 'placeholder']) {
      const key = element.getAttribute(attribute);
      if (key && Object.prototype.hasOwnProperty.call(dictionary, key)) staticAttributes.push({ element, attribute, key });
    }
  });
  let language = 'hi';
  try { language = localStorage.getItem('kalka-temple-language') === 'en' ? 'en' : 'hi'; } catch { /* Preferences are optional. */ }
  let activePanel = 'home';
  let galleryPhotos = [...(config.gallery || []), ...(window.TEMPLE_PUBLIC_CONTENT?.gallery || [])];
  window.getTempleGalleryPhotos = () => galleryPhotos;
  let viewedPhoto = null;
  const t = key => language === 'en' && Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : key;
  window.templeT = t;
  window.templeSetText = (target, key) => {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;
    element.dataset.dynamicI18n = key;
    element.textContent = t(key);
  };
  const localized = (value, fallback = '') => {
    if (typeof value === 'string') return value || t(fallback);
    return value?.[language] || value?.hi || value?.en || t(fallback);
  };
  const phoneLink = (number, label) => {
    const text = String(number || '').trim();
    const safeNumber = text.replace(/[^0-9+]/g, '');
    if (!/^\+?\d{7,15}$/.test(safeNumber)) return null;
    const a = document.createElement('a'); a.href = 'tel:' + safeNumber; a.textContent = label || text;
    return a;
  };
  const safeImageUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    value = window.TempleBackend?.imageUrl(value) ?? value;
    if (!value) return null;
    if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
    try { const url = new URL(value, location.href); return (url.protocol === 'https:' || (url.origin === location.origin && ['http:', 'file:'].includes(url.protocol))) ? url.href : null; } catch { return null; }
  };
  const updateDate = () => {
    document.getElementById('today-date').textContent = new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : 'hi-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
    document.getElementById('copyright-year').textContent = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date());
  };
  window.updateTempleDate = updateDate;
  const updateTitle = () => {
    const base = localized(window.TEMPLE_CMS_SETTINGS?.branding.pageTitle, 'श्री कालका माता मंदिर · खुड़खुड़ा कलां, नागौर');
    const tab = tabs.find(tab => tab.getAttribute('aria-controls') === activePanel);
    document.title = activePanel === 'home' ? base : tab.textContent.trim() + ' · ' + base;
  };
  const activateTab = (id, { historyMode = 'none', focusPanel = false, scroll = true } = {}) => {
    if (!panels.some(panel => panel.id === id)) id = 'home';
    activePanel = id;
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    tabs.forEach(tab => {
      const selected = tab.getAttribute('aria-controls') === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('active', selected);
    });
    if (historyMode !== 'none' && location.hash !== '#' + id) {
      try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', '#' + id); } catch { location.hash = id; }
    }
    const currentTab = tabs.find(tab => tab.getAttribute('aria-controls') === id);
    if (currentTab && typeof currentTab.scrollIntoView === 'function') currentTab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    if (focusPanel) document.getElementById(id).focus({ preventScroll: true });
    updateTitle();
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    if (!panels.some(panel => panel.id === id)) return;
    e.preventDefault();
    activateTab(id, { historyMode: 'push', focusPanel: a.getAttribute('role') !== 'tab' });
  });
  nav.addEventListener('keydown', e => {
    const index = tabs.indexOf(e.target);
    if (index === -1) return;
    let next;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    tabs[next].focus({ preventScroll: true });
    tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    activateTab(tabs[next].getAttribute('aria-controls'), { historyMode: 'push' });
  });
  const onHistory = () => activateTab(location.hash.slice(1), { scroll: true });
  window.addEventListener('hashchange', onHistory);
  window.addEventListener('popstate', onHistory);
  const renderCommittee = () => {
    const grid = document.getElementById('committee-grid'); grid.replaceChildren();
    for (const [key, role, initials] of [['president', 'अध्यक्ष', '01'], ['secretary', 'सचिव', '02'], ['treasurer', 'कोषाध्यक्ष', '03']]) {
      const person = config.committee?.[key] || {};
      const card = document.createElement('article'); card.className = 'committee-card';
      const top = document.createElement('div'); top.className = 'committee-card-top';
      const mark = document.createElement('span'); mark.className = 'officer-number'; mark.textContent = initials;
      const heading = document.createElement('h3'); heading.textContent = t(role); top.append(mark, heading);
      const nameLabel = document.createElement('p'); nameLabel.className = 'field-label'; nameLabel.textContent = t('नाम');
      const name = document.createElement('p'); name.className = 'officer-name'; name.textContent = localized(person.name, 'नाम जल्द उपलब्ध होगा');
      const phoneLabel = document.createElement('p'); phoneLabel.className = 'field-label'; phoneLabel.textContent = t('मोबाइल नंबर');
      const phone = phoneLink(person.mobile);
      const fallback = document.createElement('p'); fallback.className = 'officer-phone'; fallback.textContent = t('मोबाइल नंबर जल्द उपलब्ध होगा');
      if (phone) phone.className = 'officer-phone';
      card.append(top, nameLabel, name, phoneLabel, phone || fallback); grid.append(card);
    }
    const filled = ['president','secretary','treasurer'].every(key => localized(config.committee?.[key]?.name) && phoneLink(config.committee?.[key]?.mobile));
    document.querySelector('.committee-contact p').hidden = filled;
  };
  const renderGaushala = () => {
    const data = config.gaushala || {};
    document.getElementById('gaushala-name').textContent = localized(data.name, 'गौशाला की जानकारी');
    document.getElementById('gaushala-description').textContent = localized(data.description, 'गौशाला से संबंधित जानकारी और संपर्क विवरण यहाँ साझा किए जाएँगे।');
    for (const [id, key] of [['gaushala-detail-name','name'], ['gaushala-address','address'], ['gaushala-contact-name','contactName']]) document.getElementById(id).textContent = localized(data[key], 'विवरण जल्द उपलब्ध होगा');
    const mobile = document.getElementById('gaushala-mobile'); mobile.replaceChildren();
    const number = String(data.mobile || '').trim();
    const a = phoneLink(/^\d{10}$/.test(number) ? '+91' + number : number, number);
    mobile.append(a || document.createTextNode(t('विवरण जल्द उपलब्ध होगा')));
    const contact = document.getElementById('gaushala-donate-contact');
    contact.href = a?.href || 'tel:+918890624926';
  };
  window.renderTempleGallery = photos => {
    galleryPhotos = photos;
    if(viewedPhoto && document.getElementById('photo-dialog').open) {
      const current=photos.find(photo=>photo.id===viewedPhoto.id);
      if(current){viewedPhoto=current;const large=document.getElementById('large-photo');const url=safeImageUrl(current.url || current.imageUrl);if(url)large.src=url;large.alt=localized(language==='en'&&current.titleEn?current.titleEn:current.title,'मंदिर के दर्शन');document.getElementById('large-photo-title').textContent=large.alt;}
      else document.getElementById('photo-dialog').close();
    }
    const grid = document.getElementById('gallery-grid'); grid.replaceChildren();
    for (const photo of photos) {
      const url = safeImageUrl(photo.url || photo.imageUrl); if (!url) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'gallery-card';
      const title = localized(language === 'en' && photo.titleEn ? photo.titleEn : photo.title, 'मंदिर के दर्शन');
      button.setAttribute('aria-label', title + ' — ' + t('फोटो देखें'));
      const img = document.createElement('img'); img.src = url; img.alt = title; img.loading = 'lazy'; img.width = 600; img.height = 450;
      img.addEventListener('error', () => { button.remove(); document.getElementById('gallery-empty').hidden = Boolean(grid.children.length); });
      const caption = document.createElement('span'); caption.textContent = title;
      button.append(img, caption);
      button.addEventListener('click', () => {
        viewedPhoto = photo;
        const large = document.getElementById('large-photo'); large.src = url; large.alt = title;
        document.getElementById('large-photo-title').textContent = title;
        document.getElementById('photo-dialog').showModal();
      });
      grid.append(button);
    }
    document.getElementById('gallery-empty').hidden = Boolean(grid.children.length);
  };
  const upiPayment = () => {
    if (window.TEMPLE_SUPABASE_CONFIG?.liveDataRequired && window.templeCmsLoadState !== 'loaded') return null;
    const donation = config.donations;
    const upiId = String(donation?.upiId || '').trim();
    const payeeName = String(donation?.payeeName || '').trim();
    if (!donation?.verified || !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(upiId) || !payeeName) return null;
    const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' });
    return { upiId, payeeName, url: 'upi://pay?' + params.toString(), qrUrl: safeImageUrl(donation.qrImage) };
  };
  const fillUpiDetails = (container, payment) => {
    container.replaceChildren();
    if (payment.qrUrl) {
      const qr = document.createElement('img');
      qr.src = payment.qrUrl; qr.alt = t('दान के लिए UPI QR'); qr.className = 'donation-qr'; qr.width = 240; qr.height = 240;
      qr.addEventListener('error', () => {
        qr.hidden = true;
        const message = document.createElement('p'); message.className = 'payment-qr-error'; message.textContent = t('QR लोड नहीं हो सका। नीचे दी गई UPI ID से दान दें।'); container.prepend(message);
      }, { once: true });
      container.append(qr);
    }
    for (const [label, value] of [['UPI ID', payment.upiId], ['खाते का नाम', payment.payeeName]]) {
      const row = document.createElement('p'); row.className = 'payment-row';
      const strong = document.createElement('strong'); strong.textContent = t(label) + ': ';
      const text = document.createElement('span'); text.textContent = value;
      if (label === 'UPI ID') { text.dir = 'ltr'; text.className = 'upi-address'; }
      row.append(strong, text); container.append(row);
    }
    const link = document.createElement('a'); link.className = 'button button-gold upi-pay-button'; link.href = payment.url; link.textContent = t('UPI ऐप से दान दें'); container.append(link);
    container.hidden = false;
  };
  const renderPayments = () => {
    const donation = config.donations;
    const details = document.getElementById('payment-details');
    const popupDetails = document.getElementById('donation-popup-payment');
    const openButton = document.getElementById('donation-qr-open');
    details.replaceChildren(); details.hidden = true;
    popupDetails.replaceChildren(); popupDetails.hidden = true; openButton.hidden = true;
    window.templeSetText('donation-panel-title', 'सहयोग के लिए समिति से जुड़ें');
    window.templeSetText('donation-note', 'आधिकारिक दान विवरण के लिए मंदिर समिति से संपर्क करें।');
    const payment = upiPayment();
    if (payment) {
      fillUpiDetails(details, payment); fillUpiDetails(popupDetails, payment);
      openButton.hidden = !payment.qrUrl;
      window.templeSetText('donation-panel-title', 'मंदिर एवं गौशाला के लिए दान');
      window.templeSetText('donation-note', 'QR स्कैन करें या UPI ऐप से अपना सहयोग दें।');
    }
    if (!donation?.verified || !donation.accountNumber) return;
    details.hidden = false;
    for (const [label, value] of [['खाता धारक', donation.accountHolder], ['बैंक', donation.bankName], ['खाता संख्या', donation.accountNumber], ['IFSC', donation.ifsc]]) {
      if (!value) continue;
      const row = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = t(label) + ': ';
      row.append(strong, document.createTextNode(String(value))); details.append(row);
    }
  };
  const openDonationDialog = () => {
    const payment = upiPayment();
    const dialog = document.getElementById('donation-dialog');
    if (payment?.qrUrl && !dialog.open) dialog.showModal();
  };
  document.getElementById('donation-qr-open').addEventListener('click', openDonationDialog);
  const setLanguage = lang => {
    language = lang === 'en' ? 'en' : 'hi'; document.documentElement.lang = language;
    staticTexts.forEach(({ node, key, before, after }) => { if (node.isConnected) node.textContent = before + t(key) + after; });
    staticAttributes.forEach(({ element, attribute, key }) => element.setAttribute(attribute, t(key)));
    document.querySelectorAll('[data-dynamic-i18n]').forEach(element => { element.textContent = t(element.dataset.dynamicI18n); });
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    document.querySelector('meta[name="description"]').content = t('श्री कालका माता मंदिर, खुड़खुड़ा कलां, नागौर। दर्शन व आरती का समय, मंदिर का इतिहास, कार्यक्रम, सुविधाएँ और संपर्क जानकारी।');
    const timeLabels = document.querySelectorAll('.timing-block .time span');
    if (timeLabels[2]) timeLabels[2].textContent = language === 'en' ? 'AM' : 'बजे';
    if (timeLabels[3]) timeLabels[3].textContent = language === 'en' ? 'PM' : 'बजे';
    updateDate(); renderCommittee(); renderGaushala(); window.renderTempleGallery(galleryPhotos); renderPayments(); updateTitle();
    if (viewedPhoto && document.getElementById('photo-dialog').open) {
      const title = localized(language === 'en' && viewedPhoto.titleEn ? viewedPhoto.titleEn : viewedPhoto.title, 'मंदिर के दर्शन');
      document.getElementById('large-photo-title').textContent = title; document.getElementById('large-photo').alt = title;
    }
    try { localStorage.setItem('kalka-temple-language', language); } catch { /* The switch also works without browser storage. */ }
    window.dispatchEvent(new CustomEvent('temple-language-change', { detail: { language } }));
  };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  window.refreshTempleUi = () => setLanguage(language);
  document.querySelectorAll('[data-open-admin]').forEach(button => button.addEventListener('click', () => document.getElementById('admin-dialog').showModal()));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('[data-whatsapp]').forEach(button => button.addEventListener('click', () => {
    let groupUrl;
    try { const url = new URL(config.whatsappGroupUrl); if (url.protocol === 'https:' && url.hostname === 'chat.whatsapp.com' && url.pathname.length > 1) groupUrl = url; } catch { /* Wait for an official group invite link. */ }
    if (groupUrl) window.open(groupUrl.href, '_blank', 'noopener,noreferrer');
    else document.getElementById('whatsapp-dialog').showModal();
  }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (dialog.id === 'photo-dialog') { document.getElementById('large-photo').removeAttribute('src'); viewedPhoto = null; }
      document.body.classList.toggle('dialog-open', Boolean(document.querySelector('dialog[open]')));
    });
    new MutationObserver(() => document.body.classList.toggle('dialog-open', Boolean(document.querySelector('dialog[open]')))).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
  activateTab(location.hash.slice(1), { scroll: false });
  setLanguage(language);
  Promise.resolve(window.templeCmsReady).then(() => {
    if (config.donations?.showPopupOnOpen) openDonationDialog();
  });
})();
