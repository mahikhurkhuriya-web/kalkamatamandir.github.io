(() => {
  try { window.TEMPLE_PUBLIC_CONTENT = JSON.parse(document.getElementById('temple-content').textContent); }
  catch { window.TEMPLE_PUBLIC_CONTENT = {donationRecords:[],gallery:[]}; }
})();
