// AQUA: tell the CSS whether the video is playing. Fish, bubbles and kelp run only then.
const tank = document.querySelector('media-container.aqua');
if (tank) {
  let media = null;
  let cleanup = [];
  const bind = () => {
    const el = tank.querySelector('video, youtube-video, hls-video');
    if (el === media) return;
    cleanup.forEach((fn) => fn());
    cleanup = [];
    media = el;
    if (!el) return;
    const update = () => { tank.dataset.playing = String(!el.paused && !el.ended); };
    for (const type of ['play', 'playing', 'pause', 'ended', 'emptied']) {
      el.addEventListener(type, update);
      cleanup.push(() => el.removeEventListener(type, update));
    }
    update();
    // Seek reaction: a burst of bubbles and a quick dart of the lead fish.
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let lastPop = 0;
    const pop = () => {
      const now = performance.now();
      if (reduce.matches || now - lastPop < 140) return;
      lastPop = now;
      const seek = tank.querySelector('.slate-seek');
      const head = tank.querySelector('.slate-playhead');
      if (!seek || !head) return;
      const sr = seek.getBoundingClientRect(), hr = head.getBoundingClientRect();
      const x = hr.left + hr.width * 0.7 - sr.left, y = sr.height / 2;
      for (let i = 0; i < 8; i++) {
        const b = document.createElement('i');
        b.className = 'aqua-pop';
        b.style.cssText = `left:${x}px;top:${y}px;--ps:${4 + Math.random() * 6}px;--dx:${(Math.random() - 0.4) * 46}px;--dy:${-(24 + Math.random() * 40)}px;--pd:${Math.random() * 0.12}s`;
        b.addEventListener('animationend', () => b.remove());
        seek.append(b);
      }
      head.removeAttribute('data-dart'); void head.offsetWidth; head.setAttribute('data-dart', '');
      setTimeout(() => head.removeAttribute('data-dart'), 520);
    };
    el.addEventListener('seeking', pop);
    cleanup.push(() => el.removeEventListener('seeking', pop));
  };
  new MutationObserver(bind).observe(tank, { childList: true });
  bind();
}

// Water colour themes.
const themeBtns = [...document.querySelectorAll('.aqua-themes [data-theme]')];
if (tank && themeBtns.length) {
  const setTheme = (name, save = true) => {
    tank.dataset.theme = name;
    themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === name)));
    if (save) try { localStorage.setItem('aqua-theme', name); } catch {}
  };
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  let t = new URLSearchParams(location.search).get('theme'); try { t ||= localStorage.getItem('aqua-theme'); } catch {}
  setTheme(['reef', 'lagoon', 'deep'].includes(t) ? t : 'reef', false);
}

/* Stop, Loop, and hiding Quality / Audio rows when the source has no choices */
(() => {
  const root = document.querySelector('.slate.aqua');
  if (!root) return;
  const media = () => root.querySelector('video, youtube-video, hls-video');
  root.querySelector('[data-stop]')?.addEventListener('click', () => {
    const m = media(); if (!m) return;
    m.pause?.(); try { m.currentTime = 0; } catch {}
  });
  const loopBtn = root.querySelector('[data-loop]');
  let loopOn = false;
  const showLoop = () => {
    loopBtn.setAttribute('aria-checked', String(loopOn));
    loopBtn.querySelector('[data-loop-val]').textContent = loopOn ? 'On' : 'Off';
  };
  const applyLoop = () => { const m = media(); if (m) try { m.loop = loopOn; } catch {} };
  loopBtn?.addEventListener('click', () => { loopOn = !loopOn; applyLoop(); showLoop(); });
  // Fallback for sources without native loop (e.g. YouTube): restart on ended. Also re-apply after a source swap.
  root.addEventListener('ended', () => { if (loopOn) { const m = media(); if (m) { try { m.currentTime = 0; } catch {} m.play?.(); } } }, true);
  new MutationObserver(applyLoop).observe(root, { childList: true, subtree: true });
  for (const [key, id] of [['quality', 'slate-menu-quality'], ['audio', 'slate-menu-audio']]) {
    const row = root.querySelector(`[data-row="${key}"]`);
    const grp = root.querySelector(`#${id} .slate-menu-group`);
    if (!row || !grp) continue;
    const sync = () => { const n = grp.querySelectorAll('media-menu-radio-item').length; const empty = root.querySelector(`#${id} [data-empty]`); if (empty) empty.hidden = n > 1; };
    sync();
    new MutationObserver(sync).observe(grp, { childList: true, subtree: true });
  }
})();

(() => {
  const b = document.querySelector('.aqua [data-clock-btn]'); if (!b) return;
  const v = b.querySelector('[data-clock-val]');
  const sync = () => { v.textContent = b.getAttribute('aria-pressed') === 'true' ? 'On' : 'Off'; };
  sync(); new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ['aria-pressed'] });
})();

/* CC on/off row: drives the (hidden) Video.js captions button so state stays in sync */
(() => {
  const root = document.querySelector('.slate.aqua'); if (!root) return;
  const row = root.querySelector('[data-cc-row]'); const hid = root.querySelector('.aqua-cc-hidden');
  if (!row || !hid) return;
  const val = row.querySelector('[data-cc-val]');
  const sync = () => {
    const on = hid.hasAttribute('data-active');
    row.setAttribute('aria-checked', String(on)); val.textContent = on ? 'On' : 'Off';
    row.hidden = hid.hasAttribute('data-availability') && hid.dataset.availability === 'unavailable';
  };
  row.addEventListener('click', () => { hid.click(); setTimeout(sync, 50); });
  new MutationObserver(sync).observe(hid, { attributes: true }); sync();
})();

/* Fish logo: on/off + editable channel name, remembered per browser */
(() => {
  const root = document.querySelector('.slate.aqua'); if (!root) return;
  const box = root.querySelector('[data-logo-box]'), txt = root.querySelector('[data-logo-text]');
  const btn = root.querySelector('[data-logo-btn]'), val = root.querySelector('[data-logo-val]');
  const input = root.querySelector('[data-logo-input]'), hint = root.querySelector('[data-logo-hint]');
  if (!box || !btn || !input) return;
  const DEF = 'AQUA TV';
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const setOn = (on, save = true) => {
    box.dataset.on = String(on); btn.setAttribute('aria-checked', String(on)); val.textContent = on ? 'On' : 'Off';
    if (save) put('aqua-logo-on', on ? '1' : '0');
  };
  const setText = (t, save = true) => {
    const clean = t.replace(/\s+/g, ' ').trim().slice(0, 16) || DEF;
    txt.textContent = clean; hint.textContent = clean;
    if (save) put('aqua-logo-text', t.trim() ? clean : '');
  };
  btn.addEventListener('click', () => setOn(box.dataset.on !== 'true'));
  input.addEventListener('input', () => setText(input.value));
  // Typing must not trigger player hotkeys (space, k, m, f, arrows...). Escape still closes the menu.
  const stop = (e) => { if (e.key !== 'Escape') e.stopPropagation(); };
  input.addEventListener('keydown', stop); input.addEventListener('keyup', stop); input.addEventListener('keypress', stop);
  const savedText = get('aqua-logo-text'); if (savedText) { input.value = savedText; setText(savedText, false); }
  const savedOn = get('aqua-logo-on'); setOn(savedOn === null ? true : savedOn === '1', false);
})();

/* Toolbar toggles drive the settings rows (single source of truth) and mirror their state */
(() => {
  const root = document.querySelector('.slate.aqua'); if (!root) return;
  const map = { cc: '[data-cc-row]', clock: '[data-clock-btn]', logo: '[data-logo-btn]', loop: '[data-loop]' };
  for (const btn of root.querySelectorAll('[data-proxy]')) {
    const row = root.querySelector(map[btn.dataset.proxy]); if (!row) continue;
    const sync = () => btn.setAttribute('aria-pressed', String(row.getAttribute('aria-pressed') === 'true' || row.getAttribute('aria-checked') === 'true'));
    btn.addEventListener('click', () => { row.click(); setTimeout(sync, 60); });
    new MutationObserver(sync).observe(row, { attributes: true, attributeFilter: ['aria-pressed', 'aria-checked'] }); sync();
  }
})();

/* If the Mux stream cannot be reached, fall back to the bundled demo so the player is never empty */
(() => {
  const root = document.querySelector('.slate.aqua'); const el = root?.querySelector('hls-video[data-mux-id]');
  if (!el) return;
  let done = false;
  el.addEventListener('error', () => {
    if (done || !el.isConnected) return; done = true;
    const v = document.createElement('video'); v.setAttribute('src', 'slate-demo.mp4'); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'metadata');
    el.replaceWith(v);
  });
})();

/* The "Try your own video" panel is a developer tool: show it only with ?tools=1 */
(() => {
  if (new URLSearchParams(location.search).has('tools') || new URLSearchParams(location.search).has('src')) document.querySelector('[data-tools]')?.removeAttribute('hidden');
})();

/* Audio track row: show "Default" when Video.js has nothing to report (single-track file) */
(() => {
  const val = document.querySelector('.slate.aqua [data-row="audio"] [data-part="value"]'); if (!val) return;
  const fill = () => { if (!val.textContent.trim()) val.textContent = 'Default'; };
  fill(); new MutationObserver(fill).observe(val, { childList: true, characterData: true, subtree: true });
})();

/* Extra shortcuts for AQUA's own controls: S stop, R loop, B logo (T clock lives in clock.js) */
(() => {
  const root = document.querySelector('.slate.aqua'); if (!root) return;
  const act = { s: '[data-stop]', r: '[data-loop]', b: '[data-logo-btn]' };
  root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const sel = act[e.key.toLowerCase()]; if (!sel) return;
    root.querySelector(sel)?.click(); e.preventDefault();
  });
})();

/* Preview bar: page background and device size */
(() => {
  const stage = document.querySelector('.stage'); if (!stage) return;
  const wire = (attr, key) => {
    const btns = [...document.querySelectorAll(`[${attr}]`)];
    for (const b of btns) b.addEventListener('click', () => {
      stage.dataset[key] = b.getAttribute(attr);
      for (const o of btns) o.setAttribute('aria-pressed', String(o === b));
    });
  };
  wire('data-site-set', 'site'); wire('data-device-set', 'device');
})();

/* Copy button for the embed snippet */
(() => {
  const btn = document.getElementById('copy-embed'), code = document.getElementById('embed-code'); if (!btn || !code) return;
  btn.addEventListener('click', async () => {
    const text = code.textContent;
    try { await navigator.clipboard.writeText(text); }
    catch { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = old; }, 1600);
  });
})();

/* Embed mode: never show the developer panel */
if (document.documentElement.classList.contains('embed')) document.querySelector('[data-tools]')?.setAttribute('hidden', '');
