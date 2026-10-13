/* Shared by isolated content scripts, service worker and Node tests. */
(function (root) {
  'use strict';
  function validateUrl(raw, base) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const url = new URL(raw, base);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }
  function parseSrcset(raw, base) {
    if (typeof raw !== 'string' || !raw.trim() || /data:/.test(raw)) return [];
    const entries = [];
    let remaining = raw.trim();
    while (remaining) {
      remaining = remaining.replace(/^[\s,]+/, '');
      if (!remaining) break;
      const token = remaining.match(/^\S+/)[0];
      remaining = remaining.slice(token.length);
      let descriptor = '';
      if (!token.endsWith(',')) {
        const end = remaining.indexOf(',');
        descriptor = (end < 0 ? remaining : remaining.slice(0, end)).trim();
        remaining = end < 0 ? '' : remaining.slice(end + 1);
      }
      const url = validateUrl(token.replace(/,+$/, ''), base);
      const match = /^(\d+(?:\.\d+)?|\.\d+)(w|x)$/.exec(descriptor || '1x');
      if (!url || !match) return [];
      const size = Number(match[1]), unit = match[2];
      if (!Number.isFinite(size) || size <= 0 || (unit === 'w' && !/^\d+$/.test(match[1]))) return [];
      entries.push({ url, size, unit });
    }
    if (entries.some(e => !e) || new Set(entries.map(e => e.unit)).size !== 1 || new Set(entries.map(e => e.size)).size !== entries.length) return [];
    return entries;
  }
  function imageUrl(img, base) {
    const current = validateUrl(img.currentSrc || img.src, base);
    if (!current) return null;
    const sets = [img.srcset];
    if (img.parentElement?.tagName === 'PICTURE') {
      for (const source of img.parentElement.querySelectorAll('source')) sets.push(source.srcset);
    }
    // Upgrade only within the candidate set that contains the browser-selected URL.
    for (const raw of sets) {
      const candidates = parseSrcset(raw, base);
      if (candidates.some(c => c.url === current)) return candidates.sort((a, b) => b.size - a.size)[0].url;
    }
    return current;
  }
  function backgroundUrl(css, base) {
    const match = /^url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s'"()]+))\s*\)$/.exec(css);
    return match ? validateUrl(match[1] || match[2] || match[3], base) : null;
  }
  function imageCandidates(element, base, fallback) {
    const candidates = new Map();
    function add(raw, priority) {
      if (typeof raw !== 'string' || !raw.trim()) return;
      const url = validateUrl(raw, base);
      if (url && (!candidates.has(url) || candidates.get(url).priority < priority)) candidates.set(url, { url, priority });
    }
    function attributes(el) {
      for (const name of ['data-original', 'data-original-src', 'data-orig-file', 'data-full', 'data-full-src', 'data-full-url', 'data-large', 'data-large-src', 'data-large-file', 'data-zoom-image', 'data-hires', 'data-high-res', 'data-image-url', 'data-lightbox-src']) add(el.getAttribute?.(name), 3);
      // Read only known image fields, never arbitrary gallery arrays or scripts.
      for (const name of ['data-image', 'data-zoom']) {
        const raw = el.getAttribute?.(name);
        if (!raw) continue;
        if (raw.trim().startsWith('{')) {
          try {
            const metadata = JSON.parse(raw);
            for (const key of ['original', 'full', 'large', 'src', 'url']) add(metadata[key], 3);
          } catch { /* Malformed site metadata is not executable code. */ }
        } else if (!raw.trim().startsWith('[')) add(raw, 3);
      }
      for (const name of ['data-src', 'data-lazy-src']) add(el.getAttribute?.(name), 1);
      for (const raw of [el.srcset, el.getAttribute?.('data-srcset'), el.getAttribute?.('data-lazy-srcset')]) {
        // Descriptors order candidates within a set, never compare w with x.
        for (const candidate of parseSrcset(raw, base).sort((a, b) => b.size - a.size)) add(candidate.url, 2);
      }
    }
    attributes(element);
    if (element.parentElement?.tagName === 'PICTURE') {
      for (const source of element.parentElement.querySelectorAll('source')) attributes(source);
    }
    function exclusivelySelected(el) {
      if (!el.querySelectorAll) return true;
      const images = el.querySelectorAll('img');
      return element.tagName === 'IMG' ? images.length === 1 && images[0] === element : images.length === 0;
    }
    // Inspect the live HTML around this exact image. Stop before a shared
    // gallery, rather than borrowing the original of another thumbnail.
    if (element.tagName === 'IMG') {
      let parent = element.parentElement;
      for (let depth = 0; parent && depth < 4; depth++, parent = parent.parentElement) {
        if (['BODY', 'HTML'].includes(parent.tagName) || !exclusivelySelected(parent)) break;
        attributes(parent);
        for (const metadata of parent.querySelectorAll?.('meta[itemprop="contentUrl"]') || []) add(metadata.getAttribute('content'), 3);
        for (const download of parent.querySelectorAll?.('a[download], a[itemprop="contentUrl"]') || []) add(download.getAttribute('href'), 3);
      }
    }
    const link = element.closest?.('a[href]');
    if (link && exclusivelySelected(link)) {
      attributes(link);
      const href = validateUrl(link.getAttribute('href'), base);
      // Image decoding filters out HTML navigation targets, including endpoints
      // without a file extension. Never reinterpret a same-page fragment.
      if (href && href.split('#')[0] !== new URL(base).href.split('#')[0]) add(href, 3);
    }
    add(element.src, 0);
    add(fallback, 0);
    // Bound page-controlled work. Explicit originals come first; responsive
    // sets were inserted largest first. Always retain the displayed fallback.
    const list = [...candidates.values()].sort((a, b) => b.priority - a.priority).slice(0, 23);
    const current = validateUrl(fallback, base);
    if (current && !list.some(c => c.url === current)) list.push({ url: current, priority: 0 });
    return list;
  }
  function probeImage(url, timeout = 2500) {
    return new Promise(resolve => {
      const image = new Image();
      let timer;
      function finish(result) {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        image.removeAttribute('src');
        resolve(result);
      }
      image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null);
      image.onerror = () => finish(null);
      timer = setTimeout(() => finish(null), timeout);
      // No canvas, crossOrigin override, URL rewrite or transformed output.
      image.src = url;
    });
  }
  function youtubeContext(element, base, fallback) {
    const page = new URL(base);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(page.hostname)) return null;
    const image = validateUrl(fallback, base);
    if (!image || !['i.ytimg.com', 'img.youtube.com'].includes(new URL(image).hostname)) return null;
    const id = /^\/(?:vi|vi_webp)\/([\w-]{11})\//.exec(new URL(image).pathname)?.[1];
    if (!id) return null;
    const link = element.closest?.('a[href]');
    if (link?.querySelectorAll) {
      const images = link.querySelectorAll('img');
      if (images.length !== 1 || images[0] !== element) return null;
    }
    const href = validateUrl(link?.getAttribute('href') || page.href, base);
    if (!href) return null;
    const video = new URL(href);
    const linkedId = video.pathname === '/watch' ? video.searchParams.get('v') : /^\/shorts\/([\w-]{11})\/?$/.exec(video.pathname)?.[1];
    return video.origin === page.origin && linkedId === id ? { id, url: video.href } : null;
  }
  function youtubeImageUrls(html, id, base) {
    // Parse the page's declared player JSON as data; never execute site code.
    if (typeof html !== 'string' || html.length > 4 * 1024 * 1024) return [];
    const marker = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*\{/g;
    let match;
    while ((match = marker.exec(html))) {
      const start = marker.lastIndex - 1;
      let depth = 0, quoted = false, escaped = false;
      for (let i = start; i < html.length; i++) {
        const char = html[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') quoted = false;
          continue;
        }
        if (char === '"') quoted = true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) {
          try {
            const details = JSON.parse(html.slice(start, i + 1)).videoDetails;
            if (details?.videoId !== id || !Array.isArray(details.thumbnail?.thumbnails)) break;
            return details.thumbnail.thumbnails.slice().sort((a, b) => (Number(b.width) * Number(b.height) || 0) - (Number(a.width) * Number(a.height) || 0)).map(t => validateUrl(t.url, base)).filter(url => {
              if (!url) return false;
              const image = new URL(url);
              return ['i.ytimg.com', 'img.youtube.com'].includes(image.hostname) && new RegExp(`^/(?:vi|vi_webp)/${id}/`).test(image.pathname);
            });
          } catch { /* Continue only with another valid declaration. */ }
          break;
        }
      }
    }
    return [];
  }
  async function linkedYoutubeImages(element, base, fallback, remaining) {
    const context = youtubeContext(element, base, fallback);
    if (!context) return [];
    const live = element.ownerDocument?.querySelectorAll('script') || [];
    for (const script of live) {
      const urls = youtubeImageUrls(script.textContent, context.id, base);
      if (urls.length) return urls;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), Math.min(3000, remaining));
    try {
      const response = await fetch(context.url, { signal: abort.signal, credentials: 'same-origin' });
      if (!response.ok || new URL(response.url).origin !== new URL(base).origin || !response.headers.get('content-type')?.includes('text/html')) return [];
      if (Number(response.headers.get('content-length')) > 4 * 1024 * 1024) return [];
      return youtubeImageUrls(await response.text(), context.id, response.url);
    } catch { return []; }
    finally { clearTimeout(timer); }
  }
  async function resolveImage(element, base, fallback, probe = probeImage) {
    const deadline = Date.now() + 8000;
    const candidates = imageCandidates(element, base, fallback);
    const linked = await linkedYoutubeImages(element, base, fallback, deadline - Date.now());
    for (const url of linked.reverse()) {
      if (!candidates.some(c => c.url === url)) candidates.unshift({ url, priority: 3 });
    }
    // Retain the original fallback when linked metadata fills the budget.
    if (candidates.length > 24) {
      candidates.length = 24;
      const current = validateUrl(fallback, base);
      if (current && !candidates.some(c => c.url === current)) candidates[23] = { url: current, priority: 0 };
    }
    const available = [];
    let index = 0;
    async function inspect() {
      while (index < candidates.length && Date.now() < deadline) {
        const candidate = candidates[index++];
        try {
          const size = await probe(candidate.url, Math.min(2500, deadline - Date.now()));
          if (size && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0) available.push({ ...candidate, area: size.width * size.height });
        } catch { /* Unavailable originals must not prevent fallback. */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, inspect));
    available.sort((a, b) => b.area - a.area || b.priority - a.priority);
    return available[0]?.url || validateUrl(fallback, base);
  }
  function imageExtension(mime) {
    return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/x-ms-bmp': 'bmp', 'image/tiff': 'tif', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' })[String(mime || '').split(';')[0].trim().toLowerCase()] || null;
  }
  function filename(raw, mime) {
    const url = new URL(raw);
    let name;
    try { name = decodeURIComponent(url.pathname.split('/').pop()); } catch { name = ''; }
    name = (name || 'imagem').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').slice(0, 160);
    if (!name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) name = 'imagem';
    const extension = imageExtension(mime);
    if (extension) {
      const existing = /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase();
      const aliases = { jpg: ['jpg', 'jpeg', 'jpe'], tif: ['tif', 'tiff'] };
      if (!(aliases[extension] || [extension]).includes(existing)) name = name.replace(/\.[a-z0-9]{1,10}$/i, '') + '.' + extension;
    }
    return name;
  }
  const api = { validateUrl, parseSrcset, imageUrl, imageCandidates, resolveImage, youtubeContext, youtubeImageUrls, backgroundUrl, imageExtension, filename };
  root.ClickImageUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
