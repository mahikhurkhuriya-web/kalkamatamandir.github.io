(() => {
  'use strict';
  const $=id=>document.getElementById(id), cms=window.TempleCMS, ledger=window.TempleLedgerData, backend=window.TempleBackend;
  let state=null,draft=null,dirty=false,busy=false,authBusy=false,page='dashboard',donationPage=0,workbook=null,importRows=null,importVersion=null,editPhotoId=null,editIndex=null,backup=null;
  const labels={branding:'मंदिर का नाम एवं पहचान',hero:'मुख्य पृष्ठ',history:'मंदिर का परिचय और इतिहास',timings:'दर्शन और आरती का समय',events:'कार्यक्रम',facilities:'श्रद्धालुओं की सुविधाएँ',committee:'मंदिर समिति',gaushala:'गौशाला',contact:'संपर्क एवं मार्गदर्शन',payments:'दान की जानकारी',whatsapp:'WhatsApp समूह',footer:'वेबसाइट का निचला भाग',templeName:'मंदिर का नाम',shortLocation:'संक्षिप्त स्थान',footerLocation:'स्थान',pageTitle:'वेबसाइट का शीर्षक',metaDescription:'वेबसाइट का परिचय',devotionalSlogan:'भक्ति संदेश',eyebrow:'छोटा शीर्षक',heading:'मुख्य शीर्षक',description:'विवरण',location:'स्थान',imageAlt:'फोटो का विवरण',timingsCta:'दर्शन बटन',historyCta:'परिचय बटन',timingsLink:'आरती लिंक',title:'शीर्षक',quote:'भक्ति उद्धरण',directionsCta:'मार्गदर्शन लिंक',intro:'परिचय',opens:'खुलने का समय',closes:'बंद होने का समय',time:'समय',label:'नाम',note:'टिप्पणी / सूचना',darshan:'दर्शन',morningAarti:'प्रातः आरती',eveningAarti:'संध्या आरती',badge:'छोटा नाम',status:'तिथि / सूचना',roleLabel:'पद का नाम',name:'नाम',mobile:'मोबाइल नंबर',president:'अध्यक्ष',secretary:'सचिव',treasurer:'कोषाध्यक्ष',missingDetailsNote:'अधूरे विवरण का संदेश',address:'स्थान',contactName:'संपर्क व्यक्ति',detailsHeading:'जानकारी का शीर्षक',donateCta:'दान संपर्क बटन',phone:'मंदिर का मोबाइल नंबर',phoneDisplay:'दिखने वाला फोन नंबर',addressLines:'पूरा पता',contactLabel:'फोन का शीर्षक',mapUrl:'Google Maps लिंक',mapCta:'Maps बटन',mapNote:'मार्गदर्शन की सूचना',faqEyebrow:'यात्रा सूचना का छोटा शीर्षक',faqTitle:'यात्रा सूचना का शीर्षक',question:'प्रश्न',answer:'उत्तर',verified:'UPI ID, QR और प्राप्तकर्ता की पुष्टि मैंने कर ली है',showPopupOnOpen:'वेबसाइट खुलते ही दान QR popup दिखाएँ',upiId:'UPI ID',payeeName:'खाते का नाम',bankName:'बैंक का नाम',accountHolder:'खाता धारक',accountNumber:'बैंक खाता संख्या',ifsc:'IFSC',sectionTitle:'सहयोग पेज का शीर्षक',verifiedTitle:'दान कार्ड का शीर्षक',verifiedInstructions:'दान देने के निर्देश',fallbackTitle:'दान जानकारी उपलब्ध न होने पर शीर्षक',fallbackInstructions:'दान जानकारी उपलब्ध न होने पर संदेश',groupUrl:'WhatsApp समूह का लिंक',buttonLabel:'WhatsApp बटन का नाम',mantra:'मंत्र',committeeName:'समिति का नाम',text:'सामग्री'};
  const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(value/100);
  const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
  const button=(text,fn,className='secondary')=>{const e=node('button',text,className);e.type='button';e.addEventListener('click',fn);return e;};
  function status(message,error=false){$('admin-status').textContent=message;$('admin-status').classList.toggle('error',error);}
  async function api(path,options={}){
    if(!backend)throw new Error('प्रबंधन सेवा नहीं लोड हुई। पेज फिर खोलें।');
    return backend.api(path,options);
  }
  function clearManagement(){
    state=null;draft=null;dirty=false;donationPage=0;workbook=null;importRows=null;importVersion=null;editPhotoId=null;editIndex=null;backup=null;
    $('admin-app').hidden=true;$('account-name').textContent='';$('settings-actions').hidden=true;status('');
    for(const id of ['content-fields','events-fields','people-fields','settings-fields','admin-gallery','admin-donation-rows','admin-users','version-history','recent-activity','import-rows'])$(id).replaceChildren();
    for(const id of ['photo-form','photo-edit-form','record-form','user-form'])$(id).reset();
    for(const id of ['donation-file','hero-upload','qr-upload','backup-file','donation-from','donation-to','donation-search'])$(id).value='';
    for(const id of ['hero-preview','qr-preview'])$(id).removeAttribute('src');
    for(const id of ['import-preview','restore-backup','users-card','restore-wrap'])$(id).hidden=true;
    for(const id of ['dash-total','dash-records','dash-photos','dash-updated'])$(id).textContent='—';
    $('backup-message').textContent='';$('donation-total').textContent='';
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  }
  function showLogin(message,{signedIn=false,retry=false,error=false,form=!signedIn}={}){
    clearManagement();$('login-view').hidden=false;$('login-message').textContent=message;
    $('login-message').classList.toggle('error',error);$('login-form').hidden=!form;
    $('switch-account').hidden=!signedIn;$('login-retry').hidden=!retry;$('login-password').value='';
  }
  function setAuthBusy(value){
    authBusy=value;for(const id of ['login-email','login-password','sign-in','switch-account','login-retry'])$(id).disabled=value;
  }
  async function locked(fn){
    if(busy)return;busy=true;
    const controls=[...document.querySelectorAll('#admin-app button,#admin-app input,#admin-app select,#admin-app textarea,dialog button,dialog input')].map(e=>[e,e.disabled]);
    controls.forEach(([e])=>e.disabled=true);
    try{await fn();}catch(e){
      if(e.status===401)showLogin('लॉगिन समाप्त हो गया। फिर लॉग इन करें।',{error:true});
      else if(e.status===403)showLogin('इस अकाउंट को admin की अनुमति नहीं है। मंदिर owner से अनुमति लें।',{signedIn:true,error:true});
      else status(e.message||'बदलाव सेव नहीं हो सके।',true);
    }
    finally{busy=false;controls.forEach(([e,disabled])=>{if(e.isConnected)e.disabled=disabled;});}
  }
  async function load(){
    const next=await api('/api/admin/bootstrap');
    if(!next.user||!['owner','admin'].includes(next.user.role)){const e=new Error('Admin की अनुमति नहीं मिली।');e.status=403;throw e;}
    state=next;draft=cms.copy(state.settings);dirty=false;
    $('account-name').textContent=state.user.email+' · '+(state.user.role==='owner'?'Owner':'Admin');
    renderAll();setPage(page);$('admin-app').hidden=false;$('login-view').hidden=true;
  }
  async function authorize(){
    if(authBusy)return;setAuthBusy(true);
    $('login-message').textContent='लॉगिन की जाँच हो रही है…';$('login-message').classList.remove('error');$('login-form').hidden=true;$('switch-account').hidden=true;$('login-retry').hidden=true;
    try{
      const session=await api('/api/session');
      if(session.authorized){await load();return;}
      showLogin(session.signedIn?'इस अकाउंट को admin की अनुमति नहीं है। मंदिर owner से अनुमति लें।':'अपने अधिकृत email और password से लॉग इन करें।',{signedIn:session.signedIn});
    }catch(e){
      if(e.status===401)showLogin('अपने अधिकृत email और password से लॉग इन करें।');
      else if(e.status===403)showLogin('इस अकाउंट को admin की अनुमति नहीं है। मंदिर owner से अनुमति लें।',{signedIn:true,retry:true,error:true});
      else showLogin('प्रबंधन सेवा से संपर्क नहीं हो सका। '+(e.message||'फिर कोशिश करें।'),{form:false,retry:true,error:true});
    }finally{setAuthBusy(false);}
  }
  function setPage(value){
    if(!document.querySelector('[data-view="'+value+'"]'))value='dashboard';
    page=value;document.querySelectorAll('[data-view]').forEach(e=>e.hidden=e.dataset.view!==page);
    document.querySelectorAll('#admin-nav button').forEach(e=>{if(e.dataset.page===page)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});
    $('page-title').textContent=document.querySelector('#admin-nav [aria-current] span').textContent;
    $('settings-actions').hidden=!dirty;try{history.replaceState(null,'','#'+page);}catch{}
  }
  function markDirty(){dirty=true;$('settings-actions').hidden=false;$('dirty-status').textContent='बदलाव अभी प्रकाशित नहीं हुए हैं।';}
  const pathValue=(object,path)=>path.split('.').reduce((v,key)=>v[key],object);
  const writePath=(object,path,value)=>{const keys=path.split('.'),last=keys.pop();keys.reduce((v,key)=>v[key],object)[last]=value;};
  function fields(container,value,path){
    if(/^contact\.faq\.[01]\.answer$/.test(path)){container.append(node('p','यह उत्तर दर्शन और आरती के समय से अपने आप अपडेट होगा।','muted'));return;}
    if(['schemaVersion','timezone','imageUrl','qrImage','id','type'].includes(path.split('.').at(-1)))return;
    if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.hi==='string'&&typeof value.en==='string'){
      const pair=node('div','','bilingual-pair'),label=labels[path.split('.').at(-1)]||path.split('.').at(-1);
      pair.append(node('div',label,'pair-title'));
      for(const lang of ['hi','en']){
        const wrap=node('label',lang==='hi'?'हिन्दी':'English'),multiline=value[lang].length>100||value[lang].includes('\n')||['description','text','addressLines','answer','intro','quote'].includes(path.split('.').at(-1));
        const input=document.createElement(multiline?'textarea':'input');input.value=value[lang];input.lang=lang;input.maxLength=12000;input.dataset.path=path+'.'+lang;
        input.addEventListener('input',()=>{writePath(draft,input.dataset.path,input.value);markDirty();});wrap.append(input);pair.append(wrap);
      }container.append(pair);return;
    }
    if(Array.isArray(value)){
      value.forEach((item,index)=>{
        const heading=node('div','','item-heading');heading.append(node('strong',(path.endsWith('blocks')?(item.type==='heading'?'शीर्षक':'अनुच्छेद'):path.endsWith('faq')?'प्रश्न':'प्रविष्टि')+' '+(index+1)));
        if(path==='events.items')heading.append(button('कार्यक्रम हटाएँ',()=>{draft.events.items.splice(index,1);markDirty();renderFields();},'danger'));
        container.append(heading);fields(container,item,path+'.'+index);
      });return;
    }
    if(value&&typeof value==='object'){
      for(const[key,entry]of Object.entries(value)){
        if(['darshan','morningAarti','eveningAarti','president','secretary','treasurer'].includes(key))container.append(node('h3',labels[key]));
        fields(container,entry,path+'.'+key);
      }return;
    }
    const key=path.split('.').at(-1),label=node('label',labels[key]||key),input=document.createElement('input');input.dataset.path=path;
    if(typeof value==='boolean'){input.type='checkbox';input.checked=value;label.prepend(input);}
    else{input.value=value;input.maxLength=12000;if(['opens','closes','time'].includes(key))input.type='time';else if(['phone','mobile'].includes(key))input.type='tel';else if(['mapUrl','groupUrl'].includes(key))input.type='url';label.append(input);}
    input.addEventListener('input',()=>{
      writePath(draft,path,input.type==='checkbox'?input.checked:input.value);markDirty();
      if(['payments.upiId','payments.payeeName'].includes(path)){draft.payments.verified=false;const check=document.querySelector('[data-path="payments.verified"]');if(check)check.checked=false;}
    });container.append(label);
  }
  function renderFields(){
    const groups=[['content-fields',['branding','hero','history','facilities','footer']],['events-fields',['timings','events']],['people-fields',['committee','gaushala']],['settings-fields',['payments','contact','whatsapp']]];
    for(const[id,keys]of groups){$(id).replaceChildren();for(const key of keys){const card=node('article','','card');card.append(node('h2',labels[key]));fields(card,draft[key],key);$(id).append(card);}}
    $('hero-preview').src=backend.imageUrl(draft.hero.imageUrl);
    $('qr-preview').src=backend.imageUrl(draft.payments.qrImage);
  }
  async function confirmAction(heading,body,label='पुष्टि करें'){
    const dialog=$('confirm-dialog');$('confirm-title').textContent=heading;$('confirm-body').replaceChildren(typeof body==='string'?node('p',body):body);$('confirm-yes').textContent=label;
    return new Promise(resolve=>{
      let settled=false;const finish=value=>{if(settled)return;settled=true;dialog.close();$('confirm-yes').removeEventListener('click',yes);$('confirm-no').removeEventListener('click',no);dialog.removeEventListener('cancel',cancel);resolve(value);};
      const yes=()=>finish(true),no=()=>finish(false),cancel=e=>{e.preventDefault();finish(false);};
      $('confirm-yes').addEventListener('click',yes);$('confirm-no').addEventListener('click',no);dialog.addEventListener('cancel',cancel);dialog.showModal();
    });
  }
  function requireClean(){if(dirty)throw new Error('पहले वेबसाइट सामग्री के बदलाव सेव करें या रीलोड करके छोड़ें।');}
  async function mutate(path,method,input){
    requireClean();await api(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,baseVersion:state.version})});await load();status('बदलाव सेव हो गए और वेबसाइट पर प्रकाशित हैं।');
  }
  function renderGallery(){
    $('admin-gallery').replaceChildren();$('gallery-empty').hidden=state.gallery.length>0;$('gallery-count').textContent=state.gallery.length+' फोटो';
    state.gallery.forEach((photo,index)=>{
      const reference=backend.galleryReference(photo.id),card=node('article','','photo-card'),img=document.createElement('img');img.src=backend.imageUrl(reference);img.alt=photo.title;img.loading='lazy';
      const text=node('div',''),actions=node('div','','actions');text.append(node('h3',photo.title),node('p',photo.titleEn));
      actions.append(button('शीर्षक बदलें',()=>{editPhotoId=photo.id;$('edit-photo-title').value=photo.title;$('edit-photo-en').value=photo.titleEn;$('photo-edit-dialog').showModal();}));
      actions.append(button('मुख्य फोटो',()=>{draft.hero.imageUrl=reference;draft.hero.imageAlt={hi:photo.title,en:photo.titleEn};markDirty();renderFields();setPage('content');}));
      for(const[direction,label]of[[-1,'↑'],[1,'↓']]){
        const b=button(label,()=>locked(async()=>{const ids=state.gallery.map(p=>p.id);[ids[index],ids[index+direction]]=[ids[index+direction],ids[index]];await mutate('/api/admin/gallery-order','POST',{ids});}));
        b.disabled=index+direction<0||index+direction>=state.gallery.length;actions.append(b);
      }
      actions.append(button('हटाएँ',async()=>{if(await confirmAction('फोटो हटाएँ?',photo.title+' गैलरी से हटेगी। पुराना संस्करण बहाल करने पर फोटो वापस आ सकती है।','फोटो हटाएँ'))await locked(()=>mutate('/api/gallery/'+photo.id,'DELETE',{}));},'danger'));
      text.append(actions);card.append(img,text);$('admin-gallery').append(card);
    });
  }
  function rowValues(row){return[row.date,row.donor||'अनाम',money(row.amountPaise),row.receipt||'—',row.mode||'—',row.note||'—'];}
  function renderDonations(){
    const tbody=$('admin-donation-rows');tbody.replaceChildren();
    let result;try{result=ledger.filterRecords(state.records,$('donation-from').value,$('donation-to').value);}catch(e){$('donation-total').textContent=e.message;return;}
    const query=$('donation-search').value.trim().toLowerCase();
    const rows=result.rows.filter(row=>!query||[row.donor,row.receipt].some(v=>v.toLowerCase().includes(query))),pages=Math.max(1,Math.ceil(rows.length/50));
    donationPage=Math.min(Math.max(donationPage,0),pages-1);
    $('donation-total').textContent=rows.length+' प्रविष्टियाँ · कुल '+money(rows.reduce((sum,row)=>sum+row.amountPaise,0));
    for(const row of rows.slice(donationPage*50,(donationPage+1)*50)){
      const tr=document.createElement('tr');for(const value of rowValues(row))tr.append(node('td',value));
      const td=document.createElement('td'),actions=node('div','','actions'),index=state.records.indexOf(row);
      actions.append(button('बदलें',()=>openRecord(index)),button('हटाएँ',async()=>{if(await confirmAction('दान की प्रविष्टि हटाएँ?',row.date+' · '+money(row.amountPaise)+' · '+(row.donor||'अनाम'),'प्रविष्टि हटाएँ'))await locked(()=>mutate('/api/admin/donation-row','DELETE',{index}));},'danger'));
      td.append(actions);tr.append(td);tbody.append(tr);
    }
    $('donation-page').textContent=(donationPage+1)+' / '+pages;$('donation-prev').disabled=donationPage===0;$('donation-next').disabled=donationPage+1>=pages;
  }
  function renderAdmin(){
    $('users-card').hidden=state.user.role!=='owner';$('restore-wrap').hidden=state.user.role!=='owner';$('admin-users').replaceChildren();
    if(state.user.role==='owner'){
      const owner=node('li',state.user.email+' · मुख्य owner');$('admin-users').append(owner);
      for(const user of state.admins||[]){if(user.email.toLowerCase()===state.user.email.toLowerCase())continue;const li=node('li','');li.append(node('span',user.email+' · '+(user.active?'सक्रिय':'अनुमति हटाई गई')));
        li.append(button(user.active?'अनुमति हटाएँ':'फिर अनुमति दें',async()=>{if(await confirmAction('Admin की अनुमति बदलें?',user.email+(user.active?' का प्रबंधन अधिकार तुरंत हटेगा।':' वेबसाइट की सामग्री बदल सकेंगे।')))await locked(async()=>{requireClean();await api('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,active:!user.active})});await load();status('Admin की अनुमति अपडेट हो गई।');});},user.active?'danger':'secondary'));$('admin-users').append(li);}
    }
    $('version-history').replaceChildren();
    for(const item of state.history||[]){
      const row=node('div',''),label=node('div',item.summary);label.append(node('small',new Date(item.createdAt).toLocaleString('hi-IN')+' · '+item.createdBy));row.append(label);
      if(state.user.role==='owner'&&item.version!==state.version)row.append(button('यह संस्करण बहाल करें',async()=>{if(await confirmAction('पुराना संस्करण बहाल करें?',item.summary+' · '+new Date(item.createdAt).toLocaleString('hi-IN')+'। वेबसाइट सामग्री, दान और गैलरी इस संस्करण के अनुसार बहाल होंगे।','बहाल करें'))await locked(()=>mutate('/api/admin/restore-version','POST',{version:item.version}));}));
      $('version-history').append(row);
    }
    if(!state.history?.length)$('version-history').append(node('p','पहले बदलाव के बाद प्रकाशन का इतिहास यहाँ दिखेगा।','empty-note'));
  }
  function renderAll(){
    $('dash-total').textContent=money(state.records.reduce((sum,row)=>sum+row.amountPaise,0));$('dash-records').textContent=state.records.length;$('dash-photos').textContent=state.gallery.length;
    $('dash-updated').textContent=state.updatedAt?new Date(state.updatedAt).toLocaleString('hi-IN'):'पहला प्रकाशन बाकी';
    $('recent-activity').replaceChildren();for(const item of(state.activity||[]).slice(0,5)){const li=node('li',item.action);li.append(node('small',new Date(item.at).toLocaleString('hi-IN')+' · '+item.actor));$('recent-activity').append(li);}
    if(!state.activity?.length)$('recent-activity').append(node('li','अभी कोई admin बदलाव नहीं हुआ है।'));
    renderFields();renderGallery();renderDonations();renderAdmin();$('settings-actions').hidden=!dirty;
  }
  function openRecord(index=null){
    editIndex=index;const row=index===null?{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),amountPaise:0,donor:'',receipt:'',mode:'Cash',note:''}:state.records[index];
    $('record-title').textContent=index===null?'दान की नई प्रविष्टि':'दान की प्रविष्टि बदलें';
    for(const field of['date','donor','receipt','mode','note'])$('record-'+field).value=row[field];$('record-amount').value=row.amountPaise?row.amountPaise/100:'';$('record-dialog').showModal();
  }
  function parseSheet(){
    importRows=null;$('import-preview').hidden=true;
    try{
      const sheet=workbook.Sheets[$('donation-sheet').value],range=window.XLSX.utils.decode_range(sheet['!ref']||'A1');
      if(range.e.r>10000||range.e.c>100)throw new Error('शीट बहुत बड़ी है। दान के विवरण की शीट चुनें।');
      const rows=window.XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''});
      importRows=ledger.parseRows(rows,{date1904:workbook.Workbook?.WBProps?.date1904===true,sdk:window.XLSX});importVersion=state.version;
      $('import-rows').replaceChildren();for(const row of importRows.slice(0,20)){const tr=document.createElement('tr');rowValues(row).forEach(value=>tr.append(node('td',value)));$('import-rows').append(tr);}
      $('import-total').textContent=importRows.length+' प्रविष्टियाँ · '+money(importRows.reduce((sum,row)=>sum+row.amountPaise,0));$('import-message').textContent='तारीख़, राशि और रसीद का प्रिव्यू जाँचें। अभी कुछ प्रकाशित नहीं हुआ है।';$('import-preview').hidden=false;
    }catch(e){$('import-message').textContent=e.message+(e.rows?.length?' '+e.rows.slice(0,10).map(row=>'पंक्ति '+row.row+': '+row.message).join(' · '):'');}
  }
  async function media(kind,file){
    if(!file||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('अधिकतम 5 MB की JPG, PNG या WebP फोटो चुनें।');
    const form=new FormData();form.set('file',file);form.set('kind',kind);
    const result=await api('/api/admin/media',{method:'POST',body:form});
    if(kind==='hero')draft.hero.imageUrl=result.url;else{draft.payments.qrImage=result.url;draft.payments.verified=false;}
    markDirty();renderFields();status('फोटो अपलोड हो गई। प्रिव्यू जाँचकर सेव एवं प्रकाशित करें दबाएँ।');
  }
  function download(name,value,type='application/json'){
    const blob=new Blob([value],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();if(authBusy)return;
    const email=$('login-email').value.trim(),password=$('login-password').value;
    if(!$('login-form').checkValidity()||!email||!password){$('login-form').reportValidity();return;}
    setAuthBusy(true);$('login-message').textContent='लॉग इन हो रहा है…';$('login-message').classList.remove('error');
    try{
      if(!backend)throw new Error('प्रबंधन सेवा नहीं लोड हुई। पेज फिर खोलें।');
      await backend.signIn(email,password);
      const session=await api('/api/session');
      if(session.authorized)await load();
      else showLogin(session.signedIn?'इस अकाउंट को admin की अनुमति नहीं है। मंदिर owner से अनुमति लें।':'लॉगिन पूरा नहीं हुआ। फिर कोशिश करें।',{signedIn:session.signedIn,error:true});
    }catch(error){
      if(error.status===403)showLogin('इस अकाउंट को admin की अनुमति नहीं है। मंदिर owner से अनुमति लें।',{signedIn:true,error:true});
      else showLogin([400,401].includes(error.status)?'लॉगिन नहीं हो सका। Email और password जाँचें।':(error.message||'लॉगिन नहीं हो सका। फिर कोशिश करें।'),{retry:![400,401].includes(error.status),error:true});
    }finally{$('login-password').value='';setAuthBusy(false);}
  });
  $('switch-account').addEventListener('click',async()=>{
    if(authBusy)return;setAuthBusy(true);
    try{await backend.signOut();showLogin('अपने अधिकृत email और password से लॉग इन करें।');}
    catch(e){$('login-message').textContent=e.message||'लॉग आउट नहीं हो सका। फिर कोशिश करें।';$('login-message').classList.add('error');}
    finally{setAuthBusy(false);}
  });
  $('logout').addEventListener('click',async()=>{
    if(busy||authBusy)return;
    if(dirty&&!await confirmAction('बिना सेव किए बदलाव छोड़कर लॉग आउट करें?','आपके अधूरे बदलाव हटेंगे। प्रकाशित जानकारी सुरक्षित रहेगी।','लॉग आउट करें'))return;
    await locked(async()=>{await backend.signOut();showLogin('आप लॉग आउट हो गए हैं। फिर लॉग इन करने के लिए email और password भरें।');});
  });
  $('login-retry').addEventListener('click',authorize);
  document.querySelectorAll('#admin-nav button').forEach(e=>e.addEventListener('click',()=>setPage(e.dataset.page)));document.querySelectorAll('[data-go]').forEach(e=>e.addEventListener('click',()=>setPage(e.dataset.go)));
  document.querySelectorAll('[data-close]').forEach(e=>e.addEventListener('click',()=>e.closest('dialog').close()));
  $('reload').addEventListener('click',async()=>{if(dirty&&!await confirmAction('बिना सेव किए बदलाव छोड़ें?','सर्वर पर सेव जानकारी फिर लोड होगी। आपके अधूरे बदलाव हटेंगे।','रीलोड करें'))return;await locked(async()=>{await load();status('प्रकाशित जानकारी फिर लोड हो गई।');});});
  $('preview-settings').addEventListener('click',async()=>{
    try{cms.validateSettings(draft);const diff=node('div','');for(const key of Object.keys(labels).filter(k=>Object.hasOwn(state.settings,k))){if(JSON.stringify(draft[key])!==JSON.stringify(state.settings[key])){diff.append(node('h3',labels[key]),node('pre',JSON.stringify(draft[key],null,2)));}}
      await confirmAction('प्रकाशित होने वाले बदलाव',diff,'प्रिव्यू देखा');
    }catch(e){status(e.message,true);}
  });
  $('publish-settings').addEventListener('click',async()=>{
    let checked;try{checked=cms.validateSettings(draft);}catch(e){status(e.message,true);return;}
    if(!await confirmAction('वेबसाइट के बदलाव प्रकाशित करें?','सभी visitors नई जानकारी देखेंगे। पुराना संस्करण इतिहास में सुरक्षित रहेगा।','सेव एवं प्रकाशित करें'))return;
    await locked(async()=>{await api('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:checked,baseVersion:state.version})});await load();status('वेबसाइट की जानकारी सेव और प्रकाशित हो गई।');});
  });
  $('photo-form').addEventListener('submit',e=>{e.preventDefault();locked(async()=>{requireClean();const file=$('photo-file').files[0];if(!file||file.size>5*1024*1024)throw new Error('अधिकतम 5 MB की फोटो चुनें।');
    const form=new FormData();form.set('photo',file);form.set('title',$('photo-title').value);form.set('titleEn',$('photo-title-en').value);form.set('baseVersion',state.version||'');
    await api('/api/gallery',{method:'POST',body:form});$('photo-form').reset();await load();status('फोटो प्रकाशित हो गई। Refresh के बाद भी सुरक्षित रहेगी।');
  });});
  $('photo-edit-form').addEventListener('submit',e=>{e.preventDefault();locked(async()=>{await mutate('/api/gallery/'+editPhotoId,'PATCH',{title:$('edit-photo-title').value,titleEn:$('edit-photo-en').value});$('photo-edit-dialog').close();});});
  $('add-record').addEventListener('click',()=>openRecord());
  $('record-form').addEventListener('submit',e=>{e.preventDefault();locked(async()=>{
    const row=ledger.validateRecords([{date:$('record-date').value,amountPaise:ledger.amountValue($('record-amount').value),donor:$('record-donor').value,receipt:$('record-receipt').value,mode:$('record-mode').value,note:$('record-note').value}])[0];
    await mutate(editIndex===null?'/api/donations':'/api/admin/donation-row',editIndex===null?'POST':'PATCH',editIndex===null?{records:[row],mode:'append'}:{index:editIndex,record:row});$('record-dialog').close();
  });});
  for(const id of['donation-from','donation-to','donation-search'])$(id).addEventListener('input',()=>{donationPage=0;renderDonations();});
  $('clear-filters').addEventListener('click',()=>{for(const id of['donation-from','donation-to','donation-search'])$(id).value='';donationPage=0;renderDonations();});
  $('donation-prev').addEventListener('click',()=>{donationPage--;renderDonations();});$('donation-next').addEventListener('click',()=>{donationPage++;renderDonations();});
  $('donation-file').addEventListener('change',()=>locked(async()=>{
    importRows=null;$('import-preview').hidden=true;const file=$('donation-file').files[0];if(!file)return;
    if(file.size>5*1024*1024||!/\.(xlsx|xls|csv)$/i.test(file.name))throw new Error('अधिकतम 5 MB की XLSX, XLS या CSV चुनें।');
    workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});$('donation-sheet').replaceChildren(...workbook.SheetNames.map(name=>{const o=node('option',name);o.value=name;return o;}));
    $('sheet-wrap').hidden=workbook.SheetNames.length<2;if(!workbook.SheetNames.length)throw new Error('Excel में शीट नहीं मिली।');parseSheet();
  }));
  $('donation-sheet').addEventListener('change',parseSheet);
  $('publish-import').addEventListener('click',async()=>{
    if(!importRows)return;
    const mode=$('import-mode').value;
    if(!await confirmAction(mode==='replace'?'पूरी दान सूची बदलें?':'दान सूची में प्रविष्टियाँ जोड़ें?',importRows.length+' प्रविष्टियाँ · '+money(importRows.reduce((sum,row)=>sum+row.amountPaise,0))+(mode==='replace'?'। वर्तमान पूरी सूची बदलेगी।':'। पुरानी सूची सुरक्षित रहेगी।'),'प्रकाशित करें'))return;
    await locked(async()=>{requireClean();if(state.version!==importVersion)throw new Error('प्रकाशित जानकारी बदल गई है। Excel फिर चुनकर प्रिव्यू जाँचें।');
      await mutate('/api/donations','POST',{records:importRows,mode});importRows=null;workbook=null;$('donation-file').value='';$('import-preview').hidden=true;$('import-message').textContent='Excel का विवरण प्रकाशित हो गया। सभी visitors को दिखाई देगा।';
    });
  });
  $('export-records').addEventListener('click',()=>{const rows=[['Date','Donor','Amount','ReceiptNo','PaymentMode','Note'],...state.records.map(row=>[row.date,row.donor,row.amountPaise/100,row.receipt,row.mode,row.note])],book=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(rows),'Donations');window.XLSX.writeFile(book,'kalka-mata-donations.xlsx');});
  for(const[kind,id]of[['hero','hero-upload'],['qr','qr-upload']])$(id).addEventListener('change',()=>locked(()=>media(kind,$(id).files[0])));
  $('add-event').addEventListener('click',()=>{if(draft.events.items.length>=50){status('अधिकतम 50 कार्यक्रम रख सकते हैं।',true);return;}draft.events.items.push({id:'event-'+crypto.randomUUID(),badge:{hi:'',en:''},title:{hi:'',en:''},description:{hi:'',en:''},location:{hi:'',en:''},status:{hi:'',en:''}});markDirty();renderFields();});
  $('user-form').addEventListener('submit',e=>{e.preventDefault();locked(async()=>{requireClean();await api('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('admin-email').value,active:true})});$('user-form').reset();await load();status('Admin जोड़ दिया गया। वे अपने अकाउंट से लॉग इन कर सकते हैं।');});});
  $('download-backup').addEventListener('click',()=>locked(async()=>{const value=await api('/api/admin/backup');download('kalka-mata-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(value,null,2));status('बैकअप डाउनलोड के लिए तैयार है।');}));
  $('backup-file').addEventListener('change',()=>locked(async()=>{
    backup=null;$('restore-backup').hidden=true;const file=$('backup-file').files[0];if(!file)return;if(file.size>3*1024*1024)throw new Error('अधिकतम 3 MB की बैकअप JSON चुनें।');
    const value=JSON.parse(await file.text());if(value.format!=='kalka-temple-backup'||value.schemaVersion!==1)throw new Error('इस वेबसाइट का सही बैकअप चुनें।');cms.validateSettings(value.settings);const records=ledger.validateRecords(value.records);if(!Array.isArray(value.gallery))throw new Error('बैकअप में गैलरी का विवरण सही नहीं है।');
    backup=value;$('backup-message').textContent='प्रिव्यू: '+records.length+' दान प्रविष्टियाँ · '+money(records.reduce((sum,row)=>sum+row.amountPaise,0))+' · '+value.gallery.length+' फोटो। सामग्री भी इस बैकअप से बहाल होगी।';$('restore-backup').hidden=false;
  }));
  $('restore-backup').addEventListener('click',async()=>{if(backup&&await confirmAction('बैकअप से पूरी वेबसाइट बहाल करें?',$('backup-message').textContent,'बहाल करें'))await locked(async()=>{await mutate('/api/admin/restore','POST',{backup});backup=null;$('restore-backup').hidden=true;$('backup-file').value='';$('backup-message').textContent='बैकअप बहाल हो गया।';});});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  const initial=location.hash.slice(1);if(document.querySelector('[data-view="'+initial.replace(/[^a-z]/g,'')+'"]'))page=initial;
  authorize();
})();
