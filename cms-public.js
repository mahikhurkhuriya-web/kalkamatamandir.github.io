(() => {
  const cms=window.TempleCMS;
  let settings=cms.copy(cms.defaultSettings);
  window.templeCmsLoadState = 'loading';
  const notice = () => {
    const e=document.getElementById('published-notice');
    e.hidden=window.templeCmsLoadState!=='error';
    e.textContent=document.documentElement.lang==='en'?'Information could not be updated. Please try again shortly.':'जानकारी अपडेट नहीं हो सकी। कृपया कुछ देर बाद फिर कोशिश करें।';
  };
  window.addEventListener('temple-language-change',notice);
  window.TEMPLE_CMS_SETTINGS=settings;
  const bindings={
    'branding.templeName':['.site-header .brand strong','.footer-brand strong','.address-panel h3'],
    'branding.shortLocation':['.site-header .brand small'],
    'branding.footerLocation':['.location-top','.footer-brand small'],
    'branding.devotionalSlogan':['.devotion-bar > span:first-child','.donation-symbol'],
    'hero.eyebrow':['#home .hero-content > .eyebrow'],'hero.heading':['#hero-title'],'hero.description':['.hero-description'],'hero.location':['.hero-location'],
    'hero.timingsCta':['.hero-actions a[href="#timings"]'],'hero.historyCta':['.hero-actions a[href="#history"]'],'hero.timingsLink':['.hero-scroll'],
    'history.eyebrow':['.history-heading .eyebrow'],'history.title':['#history-title'],'history.quote':['.serif-quote'],'history.directionsCta':['.history-copy .text-link'],
    'timings.eyebrow':['.timings-intro .eyebrow'],'timings.title':['#timings-title'],'timings.intro':['.timings-intro > p:last-child'],'timings.note':['.timing-note'],
    'events.eyebrow':['#events .section-heading .eyebrow'],'events.title':['#events .section-heading h2'],'events.intro':['#events .section-heading > p'],
    'facilities.eyebrow':['#facilities .section-heading .eyebrow'],'facilities.title':['#facilities .section-heading h2'],'facilities.note':['.facility-note'],
    'committee.eyebrow':['#committee .eyebrow'],'committee.title':['#committee .section-heading h2'],'committee.intro':['.committee-intro'],'committee.missingDetailsNote':['.committee-contact p'],
    'gaushala.eyebrow':['#gaushala .eyebrow'],'gaushala.title':['#gaushala .section-heading h2'],'gaushala.detailsHeading':['.gaushala-details h3'],'gaushala.donateCta':['#gaushala-donate-contact'],
    'contact.eyebrow':['#contact .section-heading .eyebrow'],'contact.title':['#contact-title'],'contact.addressLines':['.address-panel > p:first-of-type'],
    'contact.contactLabel':['.contact-phone span'],'contact.mapCta':['.address-panel > a'],'contact.mapNote':['.map-note'],
    'contact.faqEyebrow':['.visit-panel > .eyebrow'],'contact.faqTitle':['.visit-panel > h3'],'payments.sectionTitle':['#donation-title'],'footer.mantra':['.footer-main > p'],'footer.committeeName':['#footer-committee-name']
  };
  for(const selectors of Object.values(bindings))for(const selector of selectors)document.querySelectorAll(selector).forEach(node=>node.setAttribute('data-cms',''));
  for(const selector of ['.history-copy','.timing-block','.event-grid','.facilities-grid','.visit-panel details'])document.querySelectorAll(selector).forEach(node=>node.setAttribute('data-cms',''));
  const get=path=>path.split('.').reduce((v,key)=>v?.[key],settings);
  const locale=value=>typeof value==='string'?value:value?.[document.documentElement.lang]||value?.hi||value?.en||'';
  const node=(tag,text,className)=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;};
  function config(){
    Object.assign(window.TEMPLE_CONFIG,{committee:settings.committee.officers,gaushala:settings.gaushala,donations:settings.payments,whatsappGroupUrl:settings.whatsapp.groupUrl});
  }
  function render(){
    for(const [path,selectors]of Object.entries(bindings))for(const selector of selectors)document.querySelectorAll(selector).forEach(e=>{
      if(path==='hero.heading'){const parts=locale(get(path)).split('\n');e.replaceChildren(document.createTextNode(parts.shift()||''),document.createElement('br'),node('span',parts.join('\n')));}
      else {e.textContent=locale(get(path));e.style.whiteSpace='pre-line';}
    });
    const img=document.querySelector('.hero-image');img.src=window.TempleBackend.imageUrl(settings.hero.imageUrl);img.alt=locale(settings.hero.imageAlt);
    const history=document.querySelector('.history-copy'),cta=history.querySelector('.text-link');
    history.replaceChildren(...settings.history.blocks.map(block=>node(block.type==='heading'?'h3':'p',locale(block.text))),cta);
    const format=time=>{const[h,m]=time.split(':').map(Number);return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(document.documentElement.lang==='en'?(h<12?'AM':'PM'):(h<12?'प्रातः':'सायं'));};
    const times=[format(settings.timings.darshan.opens)+' — '+format(settings.timings.darshan.closes),format(settings.timings.morningAarti.time),format(settings.timings.eveningAarti.time)];
    document.querySelectorAll('.timing-block').forEach((card,i)=>{if(!card.querySelector('.time'))return;const entry=[settings.timings.darshan,settings.timings.morningAarti,settings.timings.eveningAarti][i];if(!entry)return;card.querySelector('h3').textContent=locale(entry.label);card.querySelector('.time').textContent=times[i];card.querySelector('small').textContent=locale(entry.note);});
    const events=document.querySelector('.event-grid');events.replaceChildren(...settings.events.items.map((item,i)=>{
      const card=node('article','', 'event-card'),top=node('div','', 'event-top');top.append(node('span',String(i+1).padStart(2,'0'),'event-number'),node('span',locale(item.badge),'pill'));
      const footer=node('div','','event-footer');footer.append(node('span',locale(item.location)),node('span',locale(item.status)));card.append(top,node('h3',locale(item.title)),node('p',locale(item.description)),footer);return card;
    }));
    const facilities=document.querySelector('.facilities-grid');facilities.replaceChildren(...settings.facilities.items.map((item,i)=>{const article=node('article','');article.append(node('span',String(i+1).padStart(2,'0'),'facility-number'),node('h3',locale(item.title)),node('p',locale(item.description)));return article;}));
    const faqs=document.querySelector('.visit-panel');faqs.querySelectorAll('details').forEach(e=>e.remove());
    settings.contact.faq.forEach((faq,i)=>{const d=document.createElement('details');if(i===0)d.open=true;let answer=locale(faq.answer);
      if(i===0)answer=(document.documentElement.lang==='en'?'Darshan: ':'दर्शन: ')+times[0]+'. '+locale(settings.timings.note);
      if(i===1)answer=locale(settings.timings.morningAarti.label)+': '+times[1]+', '+locale(settings.timings.eveningAarti.label)+': '+times[2]+'. '+locale(settings.timings.note);
      d.append(node('summary',locale(faq.question)),node('p',answer));faqs.append(d);});
    document.querySelector('.address-panel > a').href=settings.contact.mapUrl;
    for(const selector of ['.devotion-bar a[href^="tel:"]','.contact-phone a','.committee-contact a','#gallery-empty a','#donation .donation-panel > a','#whatsapp-dialog a']){
      document.querySelectorAll(selector).forEach(a=>{a.href='tel:'+settings.contact.phone;if(selector!== '#gallery-empty a'&&selector!=='#whatsapp-dialog a')a.textContent=settings.contact.phoneDisplay||settings.contact.phone;});
    }
    const payment=settings.payments;
    for(const [id,value]of[['donation-panel-title',payment.verified?payment.verifiedTitle:payment.fallbackTitle],['donation-note',payment.verified?payment.verifiedInstructions:payment.fallbackInstructions],['donation-dialog-title',payment.verifiedTitle]]){
      const e=document.getElementById(id);delete e.dataset.dynamicI18n;e.textContent=locale(value);
    }
    const whatsapp=document.querySelector('[data-whatsapp] span');if(whatsapp)whatsapp.textContent=locale(settings.whatsapp.buttonLabel);
    document.querySelector('meta[name="description"]').content=locale(settings.branding.metaDescription);
    const selected=document.querySelector('#main-nav [aria-selected="true"]');const libraryOpen=!document.getElementById('library').hidden;document.title=libraryOpen?(document.getElementById('library-title').textContent+' · '+locale(settings.branding.pageTitle)):(selected?.getAttribute('aria-controls')==='home'?'':(selected?.textContent.trim()||'')+' · ')+locale(settings.branding.pageTitle);
    if(!payment.showPopupOnOpen&&document.getElementById('donation-dialog').open)document.getElementById('donation-dialog').close();
  }
  window.applyTempleSettings=value=>{settings=cms.validateSettings(value);window.templeCmsLoadState='loaded';notice();window.TEMPLE_CMS_SETTINGS=settings;config();if(window.refreshTempleUi)window.refreshTempleUi();render();};
  window.addEventListener('temple-language-change',render);config();
  window.refreshTemplePublishedSettings=async()=>{
    try {
      const data=await window.TempleBackend.api('/api/settings');
      window.applyTempleSettings(data.settings);
    } catch {
      window.templeCmsLoadState='error';notice();
      if(window.refreshTempleUi)window.refreshTempleUi();
    }
  };
  window.templeCmsReady=window.refreshTemplePublishedSettings();
})();
