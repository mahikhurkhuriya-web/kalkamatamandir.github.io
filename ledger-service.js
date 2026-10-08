(() => {
  const $=id=>document.getElementById(id), data=window.TempleLedgerData;
  let records=[],page=0,loadState='loading';
  try {records=data.validateRecords(window.TEMPLE_PUBLIC_CONTENT?.donationRecords || []);} catch {}
  window.getTempleDonationRecords=()=>records;
  const locale=()=>document.documentElement.lang==='en'?'en-IN':'hi-IN';
  const render=()=>{
    $('ledger-rows').replaceChildren();$('ledger-filter-error').hidden=true;
    let result;
    try {result=data.filterRecords(records,$('ledger-from').value,$('ledger-to').value);}
    catch { $('ledger-filter-error').textContent=window.templeT('शुरू की तारीख़ अंतिम तारीख़ के बाद नहीं हो सकती।');$('ledger-filter-error').hidden=false;$('ledger-total').textContent='—';$('ledger-count').textContent='—';$('ledger-empty').hidden=true;$('ledger-pagination').hidden=true;return;}
    const pages=Math.max(1,Math.ceil(result.rows.length/50));page=Math.min(page,pages-1);
    const money=value=>new Intl.NumberFormat(locale(),{style:'currency',currency:'INR'}).format(value/100);
    $('ledger-total').textContent=money(result.amountPaise);$('ledger-count').textContent=new Intl.NumberFormat(locale()).format(result.rows.length);
    for(const row of result.rows.slice(page*50,(page+1)*50)){
      const tr=document.createElement('tr');
      const date=new Intl.DateTimeFormat(locale(),{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(row.date+'T00:00:00Z'));
      for(const value of [date,row.donor||window.templeT('अनाम'),money(row.amountPaise),row.receipt||'—',row.mode||'—',row.note||'—']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
      $('ledger-rows').append(tr);
    }
    $('ledger-empty').hidden=result.rows.length>0;
    $('ledger-empty').textContent=window.templeT(records.length?'इस अवधि में कोई प्रविष्टि नहीं मिली।':'अभी दान का विवरण उपलब्ध नहीं है।');
    if(loadState!=='loaded') {
      $('ledger-total').textContent='—';$('ledger-count').textContent='—';$('ledger-empty').hidden=false;
      $('ledger-empty').textContent=document.documentElement.lang==='en'?(loadState==='loading'?'Loading donation records…':'Donation records could not be loaded. Please try again shortly.'):(loadState==='loading'?'दान का विवरण लोड हो रहा है…':'दान का विवरण लोड नहीं हो सका। कृपया कुछ देर बाद फिर कोशिश करें।');
    }
    $('ledger-pagination').hidden=loadState!=='loaded'||pages<2;$('ledger-page').textContent=(page+1)+' / '+pages;$('ledger-prev').disabled=page===0;$('ledger-next').disabled=page+1>=pages;
  };
  $('ledger-filters').addEventListener('submit',e=>e.preventDefault());
  for(const id of ['ledger-from','ledger-to'])$(id).addEventListener('change',()=>{page=0;render();});
  $('ledger-clear').addEventListener('click',()=>{$('ledger-from').value='';$('ledger-to').value='';page=0;render();});
  $('ledger-prev').addEventListener('click',()=>{page--;render();});$('ledger-next').addEventListener('click',()=>{page++;render();});
  window.addEventListener('temple-language-change',render);render();
  window.refreshTemplePublishedLedger=async()=>{
    try {
      const result=await window.TempleBackend.api('/api/donations');
      records=data.validateRecords(result.records);loadState='loaded';render();
    } catch {
      records=[];loadState='error';render();
    }
  };
  window.templeLedgerReady=window.refreshTemplePublishedLedger();
})();
