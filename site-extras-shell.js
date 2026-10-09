(() => {
  'use strict';
  const host = document.querySelector('#contact > .container');
  if (!host) return;
  const block = document.createElement('section');
  block.className = 'developer-credit';
  block.setAttribute('aria-label', 'वेबसाइट निर्माण एवं तकनीकी सहयोग');
  const details = document.createElement('div');
  const label = document.createElement('p'); label.className = 'eyebrow';
  const name = document.createElement('h3');
  const description = document.createElement('p');
  details.append(label,name,description);
  const links = document.createElement('div'); links.className = 'developer-credit-links';
  const phone = document.createElement('a'); phone.href = 'tel:+918890624926'; phone.textContent = '8890624926';
  const email = document.createElement('a'); email.href = 'mailto:mahikhurkhuriya@gmail.com'; email.textContent = 'mahikhurkhuriya@gmail.com';
  links.append(phone,email); block.append(details,links); host.append(block);
  function render() {
    const english = document.documentElement.lang === 'en';
    label.textContent = english ? 'Website creation & technical support' : 'वेबसाइट निर्माण एवं तकनीकी सहयोग';
    name.textContent = english ? 'Mahipal Khurkhuriya' : 'महिपाल खुड़खुड़िया';
    description.textContent = english ? 'For website suggestions or technical support, please get in touch.' : 'वेबसाइट से जुड़े सुझाव या तकनीकी सहायता के लिए संपर्क करें।';
  }
  window.addEventListener('temple-language-change',render); render();
})();
