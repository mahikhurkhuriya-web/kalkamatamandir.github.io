(() => {
  'use strict';
  const BUCKET = 'temple-media', MAX_IMAGE = 5 * 1024 * 1024, STATE_TTL = 60000, SIGN_TTL = 3600;
  const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
  const adminPage = /(?:^|\/)admin(?:\/|$)/.test(window.location.pathname);
  const assetBase = (() => {
    // This script sits in the site's base directory on both root and project Pages.
    // Admin loads it with ../supabase-service.js, so its own URL is authoritative.
    for (const script of window.document?.querySelectorAll?.('script[src]') || []) {
      try {
        const url = new URL(script.src || script.getAttribute('src'), window.document.baseURI || window.location.href);
        if (url.pathname.endsWith('/supabase-service.js')) return new URL('.', url);
      } catch { /* Ignore unrelated script URLs. */ }
    }
    return new URL('/', window.location.href);
  })();
  const clone = value => JSON.parse(JSON.stringify(value));
  const assets = new Map();
  let clients, statePromise = null, stateExpires = 0, cacheGeneration = 0;
  class ApiError extends Error { constructor(message, status = 400) { super(message); this.name = 'TempleApiError'; this.status = status; } }
  const invalid = message => { throw new ApiError(message); };
  function serviceError(error, fallback = 'ऑनलाइन सेवा से संपर्क नहीं हो सका।', defaultStatus = 503) {
    if (error instanceof ApiError) return error;
    const code = String(error?.code || ''), explicit = /^PT(\d{3})$/.exec(code);
    let status = explicit ? Number(explicit[1]) : Number(error?.status || error?.statusCode) || defaultStatus;
    if (code === '42501') status = 403;
    if (code === 'PGRST202' || code === 'PGRST205') status = 503;
    if (code === 'PGRST116') status = 404;
    const message = typeof error?.message === 'string' && error.message ? error.message : fallback;
    return new ApiError(message, status);
  }
  function initialize() {
    if (clients) return clients;
    const config = window.TEMPLE_SUPABASE_CONFIG;
    let url;
    try { url = new URL(config?.url); } catch { throw new ApiError('Supabase की जानकारी अभी नहीं जोड़ी गई है।', 503); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^\/?$/.test(url.pathname) || typeof config?.publishableKey !== 'string' || !config.publishableKey.startsWith('sb_publishable_')) throw new ApiError('Supabase की public configuration सही नहीं है।', 503);
    if (typeof window.supabase?.createClient !== 'function') throw new ApiError('ऑनलाइन सेवा की library उपलब्ध नहीं है। पेज फिर खोलें।', 503);
    const options = auth => ({auth, global: {fetch: (input, init = {}) => {
      const timeout = AbortSignal.timeout(20000);
      const signal = init.signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([init.signal, timeout]) : timeout;
      return window.fetch(input, {...init, credentials: 'omit', signal});
    }}});
    // Visitors never load the admin refresh token from browser storage.
    const publicClient = window.supabase.createClient(url.origin, config.publishableKey, options({persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'kalka-temple-public'}));
    const adminClient = adminPage ? window.supabase.createClient(url.origin, config.publishableKey, options({persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kalka-temple-admin-auth'})) : null;
    clients = {publicClient, adminClient};
    return clients;
  }
  function privateClient() {
    const client = initialize().adminClient;
    if (!client) throw new ApiError('बदलाव करने के लिए Admin login पेज खोलें।', 401);
    return client;
  }
  async function rpc(client, name, input = {}) {
    let result;
    try {
      const request = client.rpc(name, input);
      // Retrying a timed-out mutation could publish it twice; callers must reload.
      result = await (typeof request.retry === 'function' ? request.retry(false) : request);
    } catch (error) { throw serviceError(error); }
    if (result?.error) throw serviceError(result.error, 'ऑनलाइन सेवा से संपर्क नहीं हो सका।', Number(result.status) || 503);
    if (!result || result.data === null || result.data === undefined || typeof result.data !== 'object' || Array.isArray(result.data)) throw new ApiError('सर्वर का जवाब सही नहीं है। पेज फिर खोलें।', 503);
    return result.data;
  }
  function invalidate() { statePromise = null; stateExpires = 0; cacheGeneration++; }
  function logicalObject(reference) {
    let match = /^\/api\/gallery\/([a-f0-9-]{36})\/image$/.exec(reference);
    if (match && uuid(match[1])) return 'gallery/' + match[1];
    match = /^\/api\/media\/([a-f0-9-]{36})$/.exec(reference);
    if (match && uuid(match[1])) return 'media/' + match[1];
    return null;
  }
  function galleryReference(id) { if (!uuid(id)) invalid('फोटो का पहचान क्रम सही नहीं है।'); return '/api/gallery/' + id + '/image'; }
  function imageUrl(reference) {
    if (typeof reference !== 'string' || !reference) return '';
    if (logicalObject(reference)) {
      const item = assets.get(reference);
      return item && item.expires > Date.now() ? item.url : '';
    }
    if (/^\/?assets\/[a-zA-Z0-9._/-]+$/.test(reference) && !reference.includes('..')) return new URL(reference.replace(/^\//, ''), assetBase).href;
    try { const url = new URL(reference); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch {}
    return '';
  }
  async function signAssets(client, references) {
    const unique = [...new Set(references)].filter(reference => logicalObject(reference));
    if (!unique.length) return;
    const paths = unique.map(logicalObject), results = [];
    for (let offset = 0; offset < paths.length; offset += 100) {
      let result;
      try { result = await client.storage.from(BUCKET).createSignedUrls(paths.slice(offset, offset + 100), SIGN_TTL); }
      catch (error) { throw serviceError(error, 'फोटो का सुरक्षित लिंक नहीं बन सका।'); }
      if (result?.error) throw serviceError(result.error, 'फोटो का सुरक्षित लिंक नहीं बन सका।');
      if (!Array.isArray(result?.data)) throw new ApiError('फोटो का सुरक्षित लिंक नहीं बन सका।', 503);
      results.push(...result.data);
    }
    // Commit the cache only after every requested image was signed successfully.
    const pending = new Map();
    for (let index = 0; index < unique.length; index++) {
      const entry = results.find(item => item.path === paths[index]);
      if (!entry || entry.error || typeof entry.signedUrl !== 'string') throw serviceError({message: entry?.error || 'फोटो का सुरक्षित लिंक नहीं बन सका।'}, 'फोटो का सुरक्षित लिंक नहीं बन सका।', 403);
      let url;
      try { url = new URL(entry.signedUrl); } catch { throw new ApiError('फोटो का सुरक्षित लिंक सही नहीं है।', 503); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new ApiError('फोटो का सुरक्षित लिंक सही नहीं है।', 503);
      pending.set(unique[index], {url: url.href, expires: Date.now() + (SIGN_TTL - 60) * 1000});
    }
    pending.forEach((value, reference) => assets.set(reference, value));
  }
  function validators() {
    if (typeof window.TempleCMS?.validateSettings !== 'function' || typeof window.TempleLedgerData?.validateRecords !== 'function') throw new ApiError('वेबसाइट की validation library उपलब्ध नहीं है।', 503);
    return {cms: window.TempleCMS, ledger: window.TempleLedgerData};
  }
  const checked = fn => { try { return fn(); } catch (error) { throw serviceError(error, 'विवरण का प्रारूप सही नहीं है।', 400); } };
  function validGallery(value) {
    if (!Array.isArray(value) || value.length > 500) invalid('गैलरी का विवरण सही नहीं है।');
    const ids = new Set();
    return value.map(photo => {
      if (!uuid(photo?.id) || ids.has(photo.id) || typeof photo.uploadedAt !== 'string') invalid('गैलरी का विवरण सही नहीं है।');
      ids.add(photo.id);
      if (photo.objectPath !== undefined && photo.objectPath !== 'gallery/' + photo.id) invalid('फोटो का storage क्रम सही नहीं है।');
      return {id: photo.id, title: title(photo.title), titleEn: title(photo.titleEn), uploadedAt: photo.uploadedAt, objectPath: 'gallery/' + photo.id};
    });
  }
  function validState(value) {
    const {cms, ledger} = validators();
    if (!value || (value.version !== null && !uuid(value.version))) throw new ApiError('प्रकाशित विवरण का संस्करण सही नहीं है।', 503);
    return {...value, settings: checked(() => cms.validateSettings(value.settings)), records: checked(() => ledger.validateRecords(value.records)), gallery: validGallery(value.gallery)};
  }
  async function prepareState(client, value) {
    const state = validState(value);
    await signAssets(client, [...state.gallery.map(photo => galleryReference(photo.id)), state.settings.hero.imageUrl, state.settings.payments.qrImage]);
    return state;
  }
  async function readPublicState() {
    if (!statePromise || stateExpires <= Date.now()) {
      const generation = cacheGeneration;
      const pending = (async () => {
        const client = initialize().publicClient, state = await prepareState(client, await rpc(client, 'temple_public_state'));
        if (generation !== cacheGeneration) return readPublicState();
        return state;
      })();
      statePromise = pending; stateExpires = Date.now() + STATE_TTL;
      pending.catch(() => { if (statePromise === pending) { statePromise = null; stateExpires = 0; } });
    }
    return statePromise;
  }
  function title(value) { if (typeof value !== 'string' || !value.trim() || value.length > 100) invalid('हिन्दी और English शीर्षक भरें; अधिकतम 100 अक्षर।'); return value.trim(); }
  function bodyJSON(options, limit = 2 * 1024 * 1024) {
    let body = options.body;
    if (typeof body === 'string') {
      if (new TextEncoder().encode(body).length > limit) throw new ApiError('विवरण का आकार बहुत बड़ा है।', 413);
      try { body = JSON.parse(body); } catch { invalid('विवरण JSON में भेजें।'); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('विवरण का प्रारूप सही नहीं है।');
    return body;
  }
  function baseVersion(input) { if (!Object.hasOwn(input, 'baseVersion') || (input.baseVersion !== null && !uuid(input.baseVersion))) invalid('प्रकाशित संस्करण नहीं मिला। पेज फिर खोलें।'); return input.baseVersion; }
  function recordIndex(value) { if (!Number.isInteger(value) || value < 0 || value >= 2000) invalid('दान की प्रविष्टि का क्रम सही नहीं है।'); return value; }
  function validateBackup(backup) {
    if (!backup || backup.format !== 'kalka-temple-backup' || backup.schemaVersion !== 1) invalid('इस वेबसाइट की सही बैकअप फ़ाइल चुनें।');
    const {cms, ledger} = validators();
    return {...backup, settings: checked(() => cms.validateSettings(backup.settings)), records: checked(() => ledger.validateRecords(backup.records)), gallery: validGallery(backup.gallery)};
  }
  async function mutate(action, input, base) {
    const result = await rpc(privateClient(), 'temple_admin_mutate', {p_action: action, p_input: input, p_base_version: base});
    if (result.published !== true || !uuid(result.version)) throw new ApiError('बदलाव प्रकाशित होने की पुष्टि नहीं मिली। पेज फिर खोलें।', 503);
    invalidate();
    return result;
  }
  async function assertAdmin(client) {
    const session = await rpc(client, 'temple_session');
    if (!session.signedIn || !session.authorized || !['owner', 'admin'].includes(session.role)) throw new ApiError('पहले अधिकृत admin अकाउंट से लॉग इन करें।', session.signedIn ? 403 : 401);
    return session;
  }
  function imageType(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ascii = (start, size) => String.fromCharCode(...bytes.slice(start, start + size));
    const dimensions = (width, height) => width > 0 && height > 0 && width <= 12000 && height <= 12000 && width * height <= 60000000;
    if (bytes.length >= 45 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) {
      if (view.getUint32(8) !== 13 || ascii(12,4) !== 'IHDR' || !dimensions(view.getUint32(16),view.getUint32(20))) return null;
      let offset = 8, hasData = false;
      while (offset + 12 <= bytes.length) {
        const size = view.getUint32(offset), type = ascii(offset+4,4);
        if (size > bytes.length - offset - 12) return null;
        if (type === 'IDAT' && size > 0) hasData = true;
        offset += size + 12;
        if (type === 'IEND') return size === 0 && offset === bytes.length && hasData ? 'image/png' : null;
      }
      return null;
    }
    if (bytes.length >= 30 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217) {
      let offset = 2, frame = false;
      const frameMarkers = new Set([192,193,194,195,197,198,199,201,202,203,205,206,207]);
      while (offset + 4 < bytes.length) {
        if (bytes[offset++] !== 255) return null;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 217 || marker === 0) return null;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        if (offset + 2 > bytes.length) return null;
        const size = view.getUint16(offset);
        if (size < 2 || offset + size > bytes.length - 2) return null;
        if (frameMarkers.has(marker)) { if (size < 8 || !dimensions(view.getUint16(offset+5),view.getUint16(offset+3))) return null; frame = true; }
        if (marker === 218) return frame && size >= 6 && bytes.length - offset - size >= 3 ? 'image/jpeg' : null;
        offset += size;
      }
      return null;
    }
    if (bytes.length >= 26 && ascii(0,4) === 'RIFF' && ascii(8,4) === 'WEBP' && view.getUint32(4,true) === bytes.length - 8) {
      let offset = 12, frame = false;
      while (offset + 8 <= bytes.length) {
        const type = ascii(offset,4), size = view.getUint32(offset+4,true), start = offset+8;
        if (size > bytes.length - start) return null;
        if (type === 'VP8L') { if (size < 5 || bytes[start] !== 47) return null; const bits = view.getUint32(start+1,true); if (!dimensions((bits & 16383)+1,((bits>>>14)&16383)+1)) return null; frame = true; }
        else if (type === 'VP8 ') { if (size < 10 || ascii(start+3,3) !== '\x9d\x01\x2a' || !dimensions(view.getUint16(start+6,true)&16383,view.getUint16(start+8,true)&16383)) return null; frame = true; }
        else if (type === 'ANMF' && size >= 24) frame = true;
        offset = start + size + (size % 2);
      }
      return frame && offset === bytes.length ? 'image/webp' : null;
    }
    return null;
  }
  async function imageFile(form, name) {
    if (!form || typeof form.get !== 'function') invalid('फोटो फ़ाइल चुनें।');
    const file = form.get(name);
    if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size) || !file.size || file.size > MAX_IMAGE) invalid('अधिकतम 5 MB की JPG, PNG या WebP फोटो चुनें।');
    const contentType = imageType(new Uint8Array(await file.arrayBuffer()));
    if (!contentType || contentType !== file.type) invalid('फोटो का प्रारूप सही नहीं है; JPG, PNG या WebP चुनें।');
    return {file, contentType};
  }
  async function upload(path, options, gallery) {
    const client = privateClient();
    await assertAdmin(client);
    const form = options.body, {file, contentType} = await imageFile(form, gallery ? 'photo' : 'file');
    const id = window.crypto.randomUUID(), objectPath = (gallery ? 'gallery/' : 'media/') + id, reference = gallery ? galleryReference(id) : '/api/media/' + id;
    let input, base, kind;
    if (gallery) { input = {id, objectPath, title: title(form.get('title')), titleEn: title(form.get('titleEn'))}; base = baseVersion({baseVersion: form.get('baseVersion') || null}); }
    else { kind = form.get('kind'); if (!['hero','qr'].includes(kind)) invalid('फोटो का उपयोग चुनें।'); }
    const storage = client.storage.from(BUCKET);
    let uploadStarted = false, registrationAttempted = false, committed = false;
    try {
      uploadStarted = true;
      const result = await storage.upload(objectPath, file, {contentType, cacheControl: '3600', upsert: false});
      if (result?.error) throw serviceError(result.error, 'फोटो अपलोड नहीं हो सकी।');
      await signAssets(client, [reference]);
      let value;
      registrationAttempted = true;
      if (gallery) value = {...await mutate('gallery-add', input, base), id};
      else {
        value = await rpc(client, 'temple_register_media', {p_id: id, p_kind: kind, p_object_path: objectPath});
        if (value.id !== id || value.url !== reference) throw new ApiError('फोटो का पंजीकरण सही नहीं है।', 503);
      }
      committed = true;
      return value;
    } catch (failure) {
      const error = serviceError(failure);
      if (uploadStarted && !committed) {
        assets.delete(reference);
        if (registrationAttempted && ![400,401,403,404,409,413,415,422].includes(error.status)) {
          // A timed-out RPC may still commit. Deleting now could race its file check.
          error.message += ' अपलोड का परिणाम स्पष्ट नहीं है। पेज फिर खोलकर जाँचें; फ़ाइल सुरक्षित रखी गई है।';
        } else {
          try {
            const cleanup = await storage.remove([objectPath]);
            if (cleanup?.error) throw cleanup.error;
          } catch { error.message += ' अधूरी अपलोड फ़ाइल हट नहीं सकी; फिर प्रयास करने से पहले admin से जाँच कराएँ।'; }
        }
      }
      throw error;
    }
  }
  async function api(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method === 'GET' && ['/api/settings','/api/donations','/api/gallery'].includes(path)) {
      const state = await readPublicState();
      if (path === '/api/settings') return clone({settings: state.settings, version: state.version});
      if (path === '/api/donations') return clone({records: state.records, version: state.version, updatedAt: state.updatedAt});
      return {photos: state.gallery.map(photo => ({...clone(photo), url: imageUrl(galleryReference(photo.id))})), version: state.version};
    }
    if (path === '/api/session' && method === 'GET') return rpc(adminPage ? privateClient() : initialize().publicClient, 'temple_session');
    if (path === '/api/admin/bootstrap' && method === 'GET') return prepareState(privateClient(), await rpc(privateClient(), 'temple_admin_bootstrap'));
    if (path === '/api/admin/backup' && method === 'GET') return rpc(privateClient(), 'temple_admin_backup');
    if (path === '/api/admin/users' && method === 'GET') return rpc(privateClient(), 'temple_admin_users');
    if (path === '/api/admin/users' && method === 'POST') {
      const input = bodyJSON(options, 8192), email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof input.active !== 'boolean') invalid('सही admin email भरें।');
      return rpc(privateClient(), 'temple_admin_users', {p_email: email, p_active: input.active});
    }
    if (path === '/api/admin/media' && method === 'POST') return upload(path, options, false);
    if (path === '/api/gallery' && method === 'POST') return upload(path, options, true);
    const edit = /^\/api\/gallery\/([a-f0-9-]{36})$/.exec(path);
    let action;
    if (path === '/api/admin/settings' && method === 'POST') action = 'settings';
    else if (path === '/api/donations' && method === 'POST') action = 'donations';
    else if (path === '/api/admin/donation-row' && ['PATCH','DELETE'].includes(method)) action = method === 'PATCH' ? 'donation-row-patch' : 'donation-row-delete';
    else if (edit && uuid(edit[1]) && ['PATCH','DELETE'].includes(method)) action = method === 'PATCH' ? 'gallery-patch' : 'gallery-delete';
    else if (path === '/api/admin/gallery-order' && method === 'POST') action = 'gallery-order';
    else if (path === '/api/admin/restore' && method === 'POST') action = 'restore';
    else if (path === '/api/admin/restore-version' && method === 'POST') action = 'restore-version';
    else throw new ApiError('यह सेवा उपलब्ध नहीं है।', 404);
    privateClient();
    const raw = bodyJSON(options, action === 'restore' ? 3 * 1024 * 1024 : undefined), base = baseVersion(raw), {cms, ledger} = validators();
    let input;
    if (action === 'settings') input = {settings: checked(() => cms.validateSettings(raw.settings))};
    if (action === 'donations') { if (!['append','replace'].includes(raw.mode)) invalid('दान का अपलोड तरीका चुनें।'); input = {records: checked(() => ledger.validateRecords(raw.records)), mode: raw.mode}; }
    if (action === 'donation-row-patch') input = {index: recordIndex(raw.index), record: checked(() => ledger.validateRecords([raw.record]))[0]};
    if (action === 'donation-row-delete') input = {index: recordIndex(raw.index)};
    if (action === 'gallery-patch') input = {id: edit[1], title: title(raw.title), titleEn: title(raw.titleEn)};
    if (action === 'gallery-delete') input = {id: edit[1]};
    if (action === 'gallery-order') { if (!Array.isArray(raw.ids) || raw.ids.length > 500 || raw.ids.some(id => !uuid(id)) || new Set(raw.ids).size !== raw.ids.length) invalid('फोटो का क्रम सही नहीं है।'); input = {ids: raw.ids}; }
    if (action === 'restore') input = {backup: validateBackup(raw.backup)};
    if (action === 'restore-version') { if (!uuid(raw.version)) invalid('बैकअप संस्करण सही नहीं है।'); input = {version: raw.version}; }
    return mutate(action, input, base);
  }
  async function signIn(email, password) {
    const client = privateClient(), normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || typeof password !== 'string' || !password) invalid('अपना email और password भरें।');
    let result;
    try { result = await client.auth.signInWithPassword({email: normalized, password}); } catch (error) { throw serviceError(error); }
    if (result?.error) throw serviceError(result.error, 'लॉगिन नहीं हो सका।', 401);
    invalidate();
    return rpc(client, 'temple_session');
  }
  async function signOut() {
    const client = privateClient();
    let result;
    try { result = await client.auth.signOut({scope: 'local'}); } catch (error) { throw serviceError(error); }
    if (result?.error) throw serviceError(result.error);
    assets.clear(); invalidate();
    return {signedOut: true};
  }
  window.TempleBackend = Object.freeze({api, signIn, signOut, imageUrl, galleryReference});
})();
