(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'hi';
  const copy = {
    teaserEyebrow:{hi:'गौ-सेवा के बारे में जानें',en:'Explore Gau Seva'},
    teaserTitle:{hi:'सेवा के तरीके और तस्वीरें',en:'Ways to serve and photos'},
    teaserText:{hi:'लापसी, चारा अर्पण और गौ भक्तों की फोटो गैलरी देखें।',en:'Explore lapsi offerings, fodder donations and photos of devotees.'},
    teaserLink:{hi:'गौशाला के बारे में और जानें →',en:'View more about the Gaushala →'},
    back:{hi:'← गौशाला पर वापस जाएँ',en:'← Back to Gaushala'},
    eyebrow:{hi:'गौमाता की सेवा',en:'Serving Gau Mata'},
    title:{hi:'श्री कालका माता मंदिर गौशाला',en:'Shri Kalka Mata Temple Gaushala'},
    care:{hi:'गौ-सेवा कैसे करें?',en:'How can I serve the cows?'},
    photos:{hi:'गौशाला फोटो गैलरी',en:'Gaushala Photo Gallery'},
    devotees:{hi:'गौ भक्त फोटो गैलरी',en:'Gau Bhakt Photo Gallery'},
    lapsiTitle:{hi:'मंदिर प्रांगण में लापसी बनवाने की व्यवस्था',en:'Arrange lapsi at the temple'},
    fodderTitle:{hi:'हरा चारा, सूखा चारा व मौसमी सब्जियां',en:'Green and dry fodder, seasonal vegetables'},
    empty:{hi:'तस्वीरें जल्द साझा की जाएँगी।',en:'Photos will be shared soon.'},
    noteStart:{hi:'आप भी दर्शन हेतु पधारें और गौ-सेवा कर पुण्य के भागी बनें। अपनी तस्वीरें हमें ',en:'Visit for darshan and take part in Gau Seva. Send us your photos on '},
    noteLink:{hi:'व्हाट्सएप करें',en:'WhatsApp'},
    noteEnd:{hi:', हम उन्हें इस गैलरी में स्थान देंगे।',en:', and we will add them to this gallery.'}
  };
  const fallback = {
    notice:{
      hi:"🙏 गौ-सेवा हेतु विशेष निवेदन: हमारा प्रयास है कि गौमाता को सीधा पोषण मिले। अतः कृपया नकद राशि के बजाय सीधे हरा चारा, सूखा चारा या गुड़ भेंट करें। आप चाहें तो गौमाता के लिए ताज़ी मौसमी सब्जियों/फलों की गाड़ी भेज सकते हैं या यहाँ पर शुद्ध 'लापसी' (गेहूं, गुड़ और घी) भी बनवा सकते हैं। हमारा आपसे भावपूर्ण आग्रह है कि स्वयं मंदिर पधारकर अपने हाथों से गौमाता को भोग लगाएं और अपनी तस्वीरें हमारे साथ साझा करें। 🐄 जय श्री कालका माता 🐄",
      en:'🙏 A special request for Gau Seva: We want the cows to receive nourishment directly. Instead of cash, please offer green fodder, dry fodder or jaggery. You may send fresh seasonal vegetables or fruit, or arrange pure lapsi (wheat, jaggery and ghee) here. We warmly invite you to visit the temple, feed the cows with your own hands and share your photos with us. 🐄 Jai Shri Kalka Mata 🐄'
    },
    lapsi:{
      hi:'गौमाता को शुद्ध लापसी (गेहूं, गुड़ और घी से निर्मित) का भोग लगाना अत्यंत पुण्यदायी माना जाता है। जो श्रद्धालु मंदिर परिसर में ही ताज़ी लापसी बनवाना चाहते हैं, वे कृपया 1 दिन पहले गौशाला समिति को सूचित करें, ताकि शुद्ध सामग्री की व्यवस्था की जा सके। एक बार की संपूर्ण लापसी (गौ-भोग) की सहयोग राशि के लिए गौशाला समिति से जानकारी लें।',
      en:'Offering pure lapsi made from wheat, jaggery and ghee to Gau Mata is considered a blessed act. Devotees wishing to have fresh lapsi prepared at the temple should inform the Gaushala Committee one day in advance so that ingredients can be arranged. Please contact the committee for the contribution amount for one complete Gau Bhog.'
    },
    fodder:{
      hi:'यदि आप गौमाता के लिए चारे या ताज़ी सब्जियों और फलों की गाड़ी स्वयं लेकर आ रहे हैं, तो कृपया इन्हें प्रातः 7:00 बजे से 10:00 बजे तक गौशाला में अर्पित करें, ताकि गायों के भोजन का नियम बना रहे और उन्हें ताज़ा पोषण मिल सके। सूखा चारा कभी भी डलवा सकते हैं; गौशाला के पास स्टोरेज हॉल बने हुए हैं।',
      en:'If you bring a vehicle of fodder, fresh vegetables or fruit for the cows, please offer it at the Gaushala between 7:00 and 10:00 a.m. so that their feeding routine is maintained and they receive fresh nourishment. Dry fodder may be delivered at any time; storage halls are available near the Gaushala.'
    }
  };
  const text = key => copy[key][language()];
  const detail = key => {
    const supplied = window.TempleSiteStore?.getState()?.gaushalaDetails?.[key];
    return supplied?.[language()] || supplied?.hi || fallback[key][language()];
  };
  const photoUrl = photo => {
    try { return window.TempleBackend?.imageUrl(photo.url || photo.imageUrl) || ''; } catch { return ''; }
  };
  const openPhoto = (url,title) => {
    const dialog=$('photo-dialog');
    if (!dialog || !url) return;
    $('large-photo').src=url;$('large-photo').alt=title;$('large-photo-title').textContent=title;
    if (!dialog.open) dialog.showModal();
  };
  function renderPhotos(target,albumId) {
    const host=$(target);host.replaceChildren();
    const photos=(window.TempleSiteStore?.getState()?.gallery || []).filter(photo => photo.albumId===albumId && photoUrl(photo));
    if (!photos.length) { const empty=document.createElement('p');empty.className='gaushala-photo-empty';empty.textContent=text('empty');host.append(empty);return; }
    for (const photo of photos) {
      const title=language()==='en' ? (photo.titleEn || photo.title) : photo.title;
      const card=document.createElement('button');card.type='button';card.setAttribute('aria-label',title);
      const img=document.createElement('img');img.src=photoUrl(photo);img.alt=title;img.loading='lazy';img.decoding='async';
      const label=document.createElement('span');label.textContent=title;
      card.append(img,label);card.addEventListener('click',()=>openPhoto(img.src,title));host.append(card);
    }
  }
  function render() {
    const teaser=$('gaushala-more-link')?.parentElement;if (!teaser) return;
    teaser.querySelector('.eyebrow').textContent=text('teaserEyebrow');
    teaser.querySelector('h3').textContent=text('teaserTitle');
    teaser.querySelector('p:last-child').textContent=text('teaserText');
    $('gaushala-more-link').textContent=text('teaserLink');
    document.querySelector('.gaushala-back').textContent=text('back');
    $('gaushala-more-title').textContent=text('title');
    document.querySelector('#gaushala-details .section-heading .eyebrow').textContent=text('eyebrow');
    $('gaushala-marquee-text').textContent=detail('notice');
    $('gaushala-tab-care').textContent=text('care');$('gaushala-tab-photos').textContent=text('photos');$('gaushala-tab-devotees').textContent=text('devotees');
    document.querySelector('#gaushala-pane-care article:first-child h3').textContent=text('lapsiTitle');
    document.querySelector('#gaushala-pane-care article:last-child h3').textContent=text('fodderTitle');
    $('gaushala-lapsi').textContent=detail('lapsi');$('gaushala-fodder').textContent=detail('fodder');
    const note=$('gaushala-photo-note'),link=note.querySelector('a');
    link.textContent=text('noteLink');note.replaceChildren(document.createTextNode(text('noteStart')),link,document.createTextNode(text('noteEnd')));
    renderPhotos('gaushala-photo-grid','meetings');renderPhotos('gaushala-devotee-grid','gau-bhakt');
  }
  const tabs=[...document.querySelectorAll('.gaushala-inner-tabs button')];
  function choose(button) {
    tabs.forEach(tab=>{
      const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      $(tab.getAttribute('aria-controls')).hidden=!selected;
    });
  }
  tabs.forEach((tab,index)=>{
    tab.tabIndex=index===0?0:-1;
    tab.addEventListener('click',()=>choose(tab));
    tab.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      choose(tabs[next]);tabs[next].focus();
    });
  });
  window.addEventListener('temple-language-change',render);
  window.TempleSiteStore?.subscribe(render);
  render();
})();
