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
    const imageId = image && ['i.ytimg.com','img.youtube.com'].includes(new URL(image).hostname) ? /^\/(?:vi|vi_webp|an_webp)\/([\w-]{11})\//.exec(new URL(image).pathname)?.[1] : null;
    const scope = element.closest?.('ytd-thumbnail, yt-thumbnail-view-model, #thumbnail, ytd-video-preview, #mouseover-overlay');
    // Channel avatars outside thumbnail containers keep the generic resolver.
    if (element.tagName === 'IMG' && !imageId && !scope) return null;
    let link = element.closest?.('a[href]');
    if (!link && scope) {
      const links = [...(scope.querySelectorAll?.('a[href]') || [])];
      const card = scope.closest?.('ytd-rich-grid-media, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model');
      links.push(...(card?.querySelectorAll('a[href]') || []));
      const videos = links.filter(anchor=>{
        const url=validateUrl(anchor.getAttribute('href'),base);
        return url && new URL(url).origin===page.origin && (new URL(url).pathname==='/watch' || new URL(url).pathname.startsWith('/shorts/'));
      });
      const ids=new Set(videos.map(anchor=>{const url=new URL(anchor.getAttribute('href'),base);return url.searchParams.get('v') || url.pathname.split('/')[2]}));
      if (ids.size===1) link=videos[0];
    }
    if (!link && !imageId) return null;
    const href = validateUrl(link?.getAttribute('href') || page.href, base);
    if (!href) return null;
    const video = new URL(href);
    const linkedId = video.pathname === '/watch' ? video.searchParams.get('v') : /^\/shorts\/([\w-]{11})\/?$/.exec(video.pathname)?.[1];
    return video.origin === page.origin && /^[\w-]{11}$/.test(linkedId || '') && (!imageId || linkedId===imageId) ? { id:linkedId, url:video.href, scope:scope || link || element } : null;
  }
  function staticYoutubeUrl(raw,id) {
    const url=validateUrl(raw);
    if (!url) return false;
    const image=new URL(url);
    return ['i.ytimg.com','img.youtube.com'].includes(image.hostname) && new RegExp(`^/(?:vi|vi_webp)/${id}/[^/]+\\.(?:jpe?g|png|webp|avif)$`,'i').test(image.pathname);
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
              return staticYoutubeUrl(url,id);
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
    let candidates = imageCandidates(element, base, fallback);
    const youtube=youtubeContext(element,base,fallback);
    if (youtube) {
      // Static posters remain eligible even if hidden by a video preview.
      for (const image of youtube.scope.querySelectorAll?.('img') || []) {
        candidates.push(...imageCandidates(image,base,image.currentSrc || image.src));
      }
      candidates=candidates.filter(candidate=>staticYoutubeUrl(candidate.url,youtube.id));
    }
    const linked = await linkedYoutubeImages(element, base, fallback, deadline - Date.now());
    for (const url of linked.reverse()) {
      if(youtube && !staticYoutubeUrl(url,youtube.id))continue;
      if (!candidates.some(c => c.url === url)) candidates.unshift({ url, priority: 3 });
    }
    candidates=candidates.filter((candidate,index,array)=>array.findIndex(other=>other.url===candidate.url)===index);
    // Retain the original fallback when linked metadata fills the budget.
    if (candidates.length > 24) {
      candidates.length = 24;
      const current = validateUrl(fallback, base);
      if (current && (!youtube || staticYoutubeUrl(current,youtube.id)) && !candidates.some(c => c.url === current)) candidates[23] = { url: current, priority: 0 };
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
    return available[0]?.url || (youtube ? (staticYoutubeUrl(fallback,youtube.id)?validateUrl(fallback,base):null) : validateUrl(fallback, base));
  }
  function formatFromBytes(bytes) {
    const starts=signature=>signature.every((byte,index)=>bytes[index]===byte);
    const ascii=(offset,length)=>String.fromCharCode(...bytes.slice(offset,offset+length));
    if (starts([255,216,255])) return 'JPG';
    if (starts([137,80,78,71,13,10,26,10])) return 'PNG';
    if (bytes.length>=12 && ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP') return 'WEBP';
    if (ascii(0,6)==='GIF87a' || ascii(0,6)==='GIF89a') return 'GIF';
    if (bytes.length>=16 && ascii(4,4)==='ftyp') {
      const boxLength=(bytes[0]*16777216)+(bytes[1]<<16)+(bytes[2]<<8)+bytes[3];
      if(boxLength<16)return null;
      if (['avif','avis'].includes(ascii(8,4))) return 'AVIF';
      for(let offset=16;offset+4<=Math.min(bytes.length,boxLength,64);offset+=4)if(['avif','avis'].includes(ascii(offset,4)))return 'AVIF';
    }
    return null;
  }
  async function inspectImageResource(url, fetcher=fetch) {
    if (!validateUrl(url)) return {format:null,sizeBytes:null};
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),1500);
    let reader;
    try {
      const response=await fetcher(url,{headers:{Range:'bytes=0-4095'},credentials:'same-origin',signal:abort.signal});
      if (!response.ok || !response.body) return {format:null,sizeBytes:null};
      const range=/^bytes \d+-\d+\/(\d+)$/i.exec(response.headers.get("content-range") || "");
      const full=response.status===200 && !response.headers.get("content-encoding") ? response.headers.get("content-length") : null;
      const declared=range?.[1] || full;
      const sizeBytes=declared!==null && /^\d+$/.test(declared) && Number.isSafeInteger(Number(declared)) ? Number(declared) : null;
      reader=response.body.getReader();
      const chunks=[];let length=0;
      while(length<64){const {value,done}=await reader.read();if(done)break;chunks.push(value.slice(0,4096-length));length+=chunks.at(-1).length;}
      const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      return {format:formatFromBytes(bytes),sizeBytes};
    } catch { return {format:null,sizeBytes:null}; }
    finally {clearTimeout(timer);if(reader)await reader.cancel().catch(()=>{});}
  }
  async function detectImageFormat(url, fetcher=fetch) { return (await inspectImageResource(url,fetcher)).format; }
  function formatFileSize(bytes) {
    if (!Number.isSafeInteger(bytes) || bytes<0) return "Tamanho indisponível";
    if(bytes<1024)return bytes+" B";
    const unit=bytes<1048576?"KB":bytes<1073741824?"MB":"GB";
    const divisor=unit==="KB"?1024:unit==="MB"?1048576:1073741824;
    return (bytes/divisor).toLocaleString("pt-BR",{maximumFractionDigits:1})+" "+unit;
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
  function safeTitle(raw) {
    let title = String(raw || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '');
    title = title.replace(/\.(?:jpe?g|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i, '');
    title = Array.from(title).slice(0,60).join('').replace(/[. ]+$/g,'');
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(title)) title = '_' + title;
    return title;
  }
  function downloadFilename(url, title, mime) {
    const clean = safeTitle(title);
    if (!clean) return filename(url,mime);
    const extension = imageExtension(mime) || /\.(jpg|jpeg|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i.exec(filename(url))?.[1].toLowerCase();
    return clean + (extension ? '.' + extension : '');
  }
  const api = { validateUrl, parseSrcset, imageUrl, imageCandidates, resolveImage, youtubeContext, staticYoutubeUrl, youtubeImageUrls, detectImageFormat, inspectImageResource, formatFileSize, formatFromBytes, backgroundUrl, imageExtension, filename, safeTitle, downloadFilename };
  root.ClickImageUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
