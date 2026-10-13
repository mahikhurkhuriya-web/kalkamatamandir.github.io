(() => {
  'use strict';
  let pending;
  window.ensureTempleXLSX = () => {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!pending) pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../vendor/xlsx.full.min.js';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel सुविधा लोड नहीं हुई। फिर कोशिश करें।'));
      script.onerror = () => reject(new Error('Excel सुविधा लोड नहीं हुई। इंटरनेट जाँचकर फिर कोशिश करें।'));
      document.head.append(script);
    }).catch(error => { pending = null; throw error; });
    return pending;
  };
})();
