(() => {
  'use strict';
  const $ = id => document.getElementById('extras-' + id);
  const api = (route, options) => window.TempleBackend.api(route, options);
  const clone = value => JSON.parse(JSON.stringify(value));
  const money = paise => new Intl.NumberFormat('hi-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2}).format(paise / 100);
  let snapshot = null, gallery = [], staged = null, stagedVersion = null, working = false;
  const say = (id, message) => { $(id).textContent = message; };
  const row = (...values) => {
    const tr = document.createElement('tr');
    for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
    return tr;
  };
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
  };
  async function load() {
    [snapshot, {photos: gallery}] = await Promise.all([api('/api/admin/extras'),api('/api/gallery')]);
    render();
  }
  async function save(data) {
    if (!snapshot) await load();
    const result = await api('/api/admin/extras', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,baseVersion:snapshot.version})});
    if (result.published !== true || !result.version) throw new Error('प्रकाशन की पुष्टि नहीं मिली। पेज रीलोड करें।');
    snapshot = {data:result.data,version:result.version};
    render();
  }
  async function run(messageId, work) {
    if (working) return;
    working = true;
    try { await work(); }
    catch (error) {
      if (error.status === 409) await load().catch(() => {});
      const message = error.message || 'जानकारी सेव नहीं हो सकी। फिर कोशिश करें।';
      say(messageId,message); document.getElementById('admin-status').textContent=message;
    } finally { working = false; }
  }
  function renderExpenses() {
    const expenses = snapshot.data.expenses.slice().sort((a,b) => b.date.localeCompare(a.date));
    say('expense-count', `${expenses.length} प्रविष्टियाँ · कुल ${money(expenses.reduce((total,item) => total + item.amountPaise,0))}`);
    $('expense-rows').replaceChildren(...expenses.slice(0,30).map(item => row(item.date,item.description,money(item.amountPaise))));
  }
  function albumOptions(selected = '') {
    const options = snapshot.data.albums.map(album => {
      const option = document.createElement('option'); option.value = album.id; option.textContent = album.title.hi; return option;
    });
    $('photo-album').replaceChildren(...options);
    if (selected && snapshot.data.albums.some(album => album.id === selected)) $('photo-album').value = selected;
  }
  function renderPhotos() {
    const selected = $('photo-album').value;
    albumOptions(selected);
    const list = $('photo-list'); list.replaceChildren();
    for (const photo of gallery) {
      const group = document.createElement('div'); group.className = 'extra-photo-row';
      const title = document.createElement('span'); title.textContent = photo.title;
      const choose = document.createElement('select'); choose.setAttribute('aria-label', `${photo.title} का एल्बम`);
      choose.replaceChildren(...snapshot.data.albums.map(album => {
        const option = document.createElement('option'); option.value = album.id; option.textContent = album.title.hi; return option;
      }));
      choose.value = snapshot.data.photoAlbums[photo.id] || 'temple-darshan';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = 'एल्बम बदलें';
      button.addEventListener('click', () => run('photo-progress',async () => {
        const data = clone(snapshot.data); data.photoAlbums[photo.id] = choose.value;
        await save(data); say('photo-progress','फोटो का एल्बम प्रकाशित हो गया।');
      }));
      group.append(title,choose,button); list.append(group);
    }
    if (!gallery.length) list.textContent = 'अभी कोई फोटो प्रकाशित नहीं है।';
  }
  function renderLibrary() {
    const library = snapshot.data.library;
    for (const name of ['name','hours','address','contactName','admission','rules'])
      for (const lang of ['hi','en']) $('library-'+name+'-'+lang).value = library[name]?.[lang] || '';
    $('library-phone').value = library.phone || '';
    for (const key of ['totalSeats','allocatedSeats','waiting']) $('library-'+key).value = library[key] == null ? '' : String(library[key]);
    updateFree();
  }
  function updateFree() {
    const total = $('library-totalSeats').value, allocated = $('library-allocatedSeats').value;
    $('library-free').textContent = total === '' || allocated === '' ? '—' : String(Math.max(0,Number(total)-Number(allocated)));
  }
  function render() { if (!snapshot) return; renderExpenses(); renderPhotos(); renderLibrary(); }
  function sheetDate(raw, book) {
    if (raw instanceof Date && Number.isFinite(raw.getTime())) return raw.toISOString().slice(0,10);
    if (typeof raw === 'number') {
      const parts = window.XLSX.SSF.parse_date_code(raw,{date1904:book.Workbook?.WBProps?.date1904 === true});
      if (!parts) return '';
      const result = `${parts.y}-${String(parts.m).padStart(2,'0')}-${String(parts.d).padStart(2,'0')}`;
      return validDate(result) ? result : '';
    }
    const value = String(raw || '').trim();
    if (validDate(value)) return value;
    const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
    if (match) { const candidate = `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`; return validDate(candidate) ? candidate : ''; }
    return '';
  }
  async function readSheet(file) {
    if (!file || file.size > 5*1024*1024 || !/\.(?:xlsx|xls|csv)$/i.test(file.name)) throw new Error('5 MB तक की Excel या CSV फ़ाइल चुनें।');
    const book = window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const sheet = book.Sheets[book.SheetNames[0]], rows = window.XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''});
    if (rows.length < 2 || rows.length > 2001) throw new Error('शीट में 1 से 2000 तक खर्च की पंक्तियाँ रखें।');
    const header = rows[0].map(value => String(value).trim().toLowerCase().replace(/\s/g,''));
    const index = aliases => header.findIndex(cell => aliases.includes(cell));
    const dateAt=index(['date','तारीख','दिनांक']), descriptionAt=index(['description','details','विवरण','खर्चकाविवरण']), amountAt=index(['amount','राशि','खर्च','expense']);
    if ([dateAt,descriptionAt,amountAt].some(position => position < 0)) throw new Error('पहली पंक्ति में Date, Description और Amount कॉलम रखें।');
    const data=[];
    for (let i=1;i<rows.length;i++) {
      const cells=rows[i]; if (cells.every(value => String(value).trim() === '')) continue;
      const date=sheetDate(cells[dateAt],book), description=String(cells[descriptionAt] || '').trim();
      const raw=String(cells[amountAt] || '').replace(/[₹,\s]/g,''),amount=Number(raw), paise=Math.round(amount*100);
      if (!date || description.length < 2 || description.length > 300 || !Number.isFinite(amount) || amount <= 0
        || !Number.isSafeInteger(paise) || Math.abs(paise/100-amount) > 0.00001 || paise > 100000000000)
        throw new Error(`Excel की पंक्ति ${i+1} में तारीख़, विवरण या राशि सही नहीं है।`);
      data.push({id:crypto.randomUUID(),date,description,descriptionEn:description,amountPaise:paise});
    }
    if (!data.length) throw new Error('Excel में खर्च की कोई प्रविष्टि नहीं मिली।');
    return data;
  }
  $('expense-file').addEventListener('change',() => run('expense-message',async () => {
    staged=null; $('expense-stage').hidden=true;
    if (!snapshot) await load();
    staged = await readSheet($('expense-file').files[0]); stagedVersion=snapshot.version;
    say('expense-summary', `${staged.length} नई प्रविष्टियाँ · कुल ${money(staged.reduce((sum,item) => sum+item.amountPaise,0))}। जाँचकर प्रकाशित करें।`);
    $('expense-stage').hidden=false; say('expense-message','अभी कोई बदलाव प्रकाशित नहीं हुआ है।');
  }));
  $('expense-publish').addEventListener('click',() => run('expense-message',async () => {
    if (!staged || stagedVersion !== snapshot.version) throw new Error('जानकारी बदल गई है। Excel फिर चुनें।');
    const data=clone(snapshot.data);
    const signatures=new Set(data.expenses.map(item => `${item.date}|${item.description.toLowerCase()}|${item.amountPaise}`));
    let added=0;
    for (const item of staged) { const sign=`${item.date}|${item.description.toLowerCase()}|${item.amountPaise}`;
      if (!signatures.has(sign)) {data.expenses.push(item);signatures.add(sign);added++;} }
    if (!added) {say('expense-message','ये प्रविष्टियाँ पहले से मौजूद हैं।');return;}
    if (data.expenses.length > 2000) throw new Error('कुल खर्च की अधिकतम 2000 प्रविष्टियाँ रख सकते हैं।');
    await save(data); staged=null; $('expense-file').value=''; $('expense-stage').hidden=true;
    say('expense-message',`${added} नई प्रविष्टियाँ प्रकाशित हो गईं।`);
  }));
  $('album-form').addEventListener('submit',event => {event.preventDefault();run('photo-progress',async () => {
    if (!snapshot) await load();
    const hi=$('album-hi').value.trim(),en=$('album-en').value.trim();
    if (hi.length < 2 || en.length < 2) throw new Error('एल्बम का हिन्दी और English नाम भरें।');
    const id='album-'+crypto.randomUUID().slice(0,8),data=clone(snapshot.data);
    data.albums.push({id,title:{hi,en},date:$('album-date').value});
    await save(data);$('album-form').reset();$('photo-album').value=id; say('photo-progress','नया एल्बम प्रकाशित हो गया।');
  });});
  $('photo-form').addEventListener('submit',event => {event.preventDefault();run('photo-progress',async () => {
    const files=[...$('photo-files').files], album=$('photo-album').value;
    if (!files.length || files.length > 20) throw new Error('एक बार में 1 से 20 फोटो चुनें।');
    if (!snapshot) await load();
    if (!snapshot.data.albums.some(item => item.id === album)) throw new Error('एल्बम फिर चुनें।');
    for (const file of files) if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 1 || file.size > 5*1024*1024)
      throw new Error('हर फोटो JPG, PNG या WebP में और 5 MB तक रखें।');
    const ids=[];
    try {
      for (let i=0;i<files.length;i++) {
        say('photo-progress',`${i+1}/${files.length} फोटो अपलोड हो रही है…`);
        const current=await api('/api/admin/bootstrap');
        const file=files[i], title=file.name.replace(/\.[^.]+$/,'').trim().slice(0,100) || `फोटो ${i+1}`;
        const form=new FormData(); form.set('photo',file);form.set('title',title);form.set('titleEn',title);form.set('baseVersion',current.version);
        const result=await api('/api/gallery',{method:'POST',body:form}); ids.push(result.id);
      }
    } finally {
      if (ids.length) {
        await load();const data=clone(snapshot.data);
        for (const id of ids) data.photoAlbums[id]=album;
        await save(data);
      }
    }
    $('photo-form').reset(); say('photo-progress',`${ids.length} फोटो ${snapshot.data.albums.find(item => item.id===album)?.title.hi || 'एल्बम'} में प्रकाशित हो गईं।`);
  });});
  $('library-form').addEventListener('input',updateFree);
  $('library-form').addEventListener('submit',event => {event.preventDefault();run('photo-progress',async () => {
    if (!snapshot) await load();
    const data=clone(snapshot.data),library=data.library;
    for (const name of ['name','hours','address','contactName','admission','rules'])
      for (const lang of ['hi','en']) library[name][lang]=$('library-'+name+'-'+lang).value.trim();
    library.phone=$('library-phone').value.trim();
    for (const key of ['totalSeats','allocatedSeats','waiting']) {
      const value=$('library-'+key).value.trim();library[key]=value === '' ? null : Number(value);
      if (library[key] !== null && (!Number.isInteger(library[key]) || library[key] < 0 || library[key] > 100000)) throw new Error('सीटों की संख्या सही भरें।');
    }
    if ((library.totalSeats === null) !== (library.allocatedSeats === null) ||
      library.allocatedSeats !== null && library.allocatedSeats > library.totalSeats)
      throw new Error('कुल और आवंटित सीटें साथ भरें; आवंटित सीटें कुल से अधिक नहीं हो सकतीं।');
    await save(data); document.getElementById('admin-status').textContent='पुस्तकालय की जानकारी प्रकाशित हो गई।';
  });});
  document.querySelectorAll('#admin-nav button[data-page="expenses"],#admin-nav button[data-page="albums"],#admin-nav button[data-page="library"]').forEach(button =>
    button.addEventListener('click',() => run('photo-progress',load)));
  document.getElementById('reload').addEventListener('click',() => {if (!document.getElementById('admin-app').hidden) load().catch(() => {});});
})();
