/* Shared by isolated content scripts, service worker and Node tests. */
(function (root) {
  'use strict';
  function validateUrl(raw, base) {
    try {
      const url = new URL(raw, base);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }
  function parseSrcset(raw, base) {
    // Ambiguous lists (including comma-bearing URLs) fall back to currentSrc.
    if (!raw || /data:/.test(raw)) return [];
    const entries = raw.split(',').map(part => {
      const match = part.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)(w|x)$/);
      if (!match) return null;
      const url = validateUrl(match[1], base), size = Number(match[2]);
      if (!url || size <= 0 || (match[3] === 'w' && !Number.isInteger(size))) return null;
      return { url, size, unit: match[3] };
    });
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
  function filename(raw) {
    const url = new URL(raw);
    let name;
    try { name = decodeURIComponent(url.pathname.split('/').pop()); } catch { name = ''; }
    name = (name || 'imagem').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').slice(0, 160);
    if (!name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) name = 'imagem';
    return name;
  }
  const api = { validateUrl, parseSrcset, imageUrl, backgroundUrl, filename };
  root.ClickImageUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
