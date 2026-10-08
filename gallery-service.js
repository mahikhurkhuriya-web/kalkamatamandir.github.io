(() => {
  let failed=false;
  const renderMessage=()=>{
    const message=document.querySelector('#gallery-empty p');
    if(!message)return;
    message.textContent=failed
      ? (document.documentElement.lang==='en'?'Photos could not be loaded. Please try again shortly.':'फोटो लोड नहीं हो सकीं। कृपया कुछ देर बाद फिर कोशिश करें।')
      : window.templeT('दर्शन, विशेष शृंगार और मंदिर के आयोजनों की तस्वीरें यहाँ देखें।');
  };
  window.addEventListener('temple-language-change',renderMessage);
  window.refreshTemplePublishedGallery = async () => {
    try {
      const result = await window.TempleBackend.api('/api/gallery');
      if(!Array.isArray(result.photos))throw new Error('Invalid gallery response');
      failed=false;
      window.renderTempleGallery(result.photos);
    } catch {
      failed=true;
      window.renderTempleGallery([]);
    }
    renderMessage();
  };
  window.templeGalleryReady=window.refreshTemplePublishedGallery();
})();
