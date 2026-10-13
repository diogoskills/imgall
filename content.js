(function () {
  'use strict';
  if (globalThis.__clickImageInstalled) return;
  globalThis.__clickImageInstalled = true;
  const utils = globalThis.ClickImageUtils;
  let active = false, resolving = false, token = '', host, box, label, selected, timer;
  function ui() {
    if (host?.isConnected) return;
    host = document.createElement('div');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = ':host{pointer-events:none} .box{position:fixed;display:none;border:3px solid #2563eb;border-radius:6px;box-sizing:border-box;box-shadow:0 0 0 3px #ffffffa0} .label{position:fixed;top:16px;right:16px;max-width:360px;padding:12px 16px;border-radius:10px;background:#172554;color:white;font:14px/1.5 system-ui;box-shadow:0 4px 20px #0004}';
    box = document.createElement('div'); box.className = 'box';
    label = document.createElement('div'); label.className = 'label'; label.setAttribute('role', 'status');
    shadow.append(style, box, label);
    document.documentElement.append(host);
  }
  function feedback(text) {
    ui(); clearTimeout(timer); label.textContent = text;
    timer = setTimeout(() => { if (!active && !resolving) host?.remove(); }, 4500);
  }
  function candidate(event) {
    for (const el of event.composedPath()) {
      if (!(el instanceof Element) || el === host) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || el.getAttribute('role') === 'presentation' || el.getAttribute('aria-hidden') === 'true') continue;
      if (el.tagName === 'IMG') return { el, url: utils.validateUrl(el.currentSrc || el.src, document.baseURI), rect };
      const css = getComputedStyle(el).backgroundImage;
      if (css !== 'none' && utils.backgroundUrl(css, document.baseURI)) return { el, url: utils.backgroundUrl(css, document.baseURI), rect };
    }
    return null;
  }
  function move(event) {
    selected = candidate(event);
    if (!selected) { box.style.display = 'none'; return; }
    const r = selected.rect;
    box.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none`;
  }
  function clearHighlight() { selected = null; if (box) box.style.display = 'none'; }
  function deactivate() {
    active = false;
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key, true);
    window.removeEventListener('scroll', clearHighlight, true);
    window.removeEventListener('resize', clearHighlight, true);
    cursorStyle?.remove(); cursorStyle = null;
    clearHighlight();
  }
  let cursorStyle;
  function key(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); deactivate(); feedback('Seleção cancelada.'); }
  }
  async function click(event) {
    const target = candidate(event);
    if (!target) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const selectionToken = token;
    deactivate();
    resolving = true;
    feedback('Buscando a maior imagem disponível…');
    try {
      const url = await utils.resolveImage(target.el, document.baseURI, target.url);
      if (!url) { feedback('Esta imagem não possui uma URL HTTP/HTTPS direta acessível.'); return; }
      const result = await chrome.runtime.sendMessage({ type: 'CLICKIMAGE_DOWNLOAD', token: selectionToken, url });
      feedback(result?.ok ? 'Download iniciado. Confira os downloads do Chrome.' : result?.error || 'Não foi possível baixar esta imagem.');
    } catch { feedback('A extensão foi desconectada. Recarregue a página e tente novamente.'); }
    finally { resolving = false; }
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'CLICKIMAGE_ACTIVATE' && typeof message.token === 'string') {
      if (resolving) { reply?.({ accepted: false }); feedback('Aguarde a busca da imagem selecionada.'); return; }
      if (active) { reply?.({ accepted: false }); deactivate(); feedback('Seleção cancelada.'); return; }
      token = message.token; active = true; ui(); clearTimeout(timer);
      label.textContent = 'ClickImage ativo · clique em uma imagem · ESC cancela';
      cursorStyle = document.createElement('style'); cursorStyle.textContent = '*{cursor:crosshair!important}'; document.documentElement.append(cursorStyle);
      window.addEventListener('pointermove', move, true);
      window.addEventListener('click', click, true);
      window.addEventListener('keydown', key, true);
      window.addEventListener('scroll', clearHighlight, true);
      window.addEventListener('resize', clearHighlight, true);
      reply?.({ accepted: true });
    } else if (message?.type === 'CLICKIMAGE_ERROR') feedback(message.error);
  });
})();
