(() => {
  // Refresh published content and signed photos when a visitor keeps the page open.
  const interval=40*60*1000;
  let lastAttempt=Date.now(),running=false;
  const refresh=async()=>{
    if(document.hidden||running||Date.now()-lastAttempt<interval)return;
    running=true;lastAttempt=Date.now();
    try{await Promise.allSettled([window.refreshTemplePublishedSettings(),window.refreshTemplePublishedGallery(),window.refreshTemplePublishedLedger()]);}
    finally{running=false;}
  };
  document.addEventListener('visibilitychange',refresh);
  window.setInterval(refresh,60000);
})();
