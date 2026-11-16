// One clock toggle for all three skins. Markup contract:
//   [data-clock-btn]  the button      [data-clock-box] the box (gets data-on="true|false")
//   [data-clock-time] optional HH:MM  [data-clock-sec] optional seconds
//   data-clock-key    storage key     data-clock-default="on" shows it until the viewer chooses
const btn = document.querySelector('[data-clock-btn]');
const box = document.querySelector('[data-clock-box]');
const player = document.querySelector('media-container');
if (btn && !box) btn.remove();
if (btn && box) {
  const key = box.dataset.clockKey || 'clock';
  const timeEl = box.querySelector('[data-clock-time]');
  const secEl = box.querySelector('[data-clock-sec]');
  let timer = 0;
  const tick = () => {
    const d = new Date();
    if (timeEl) timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (secEl) secEl.textContent = String(d.getSeconds()).padStart(2, '0');
    box.style.setProperty('--sec', (d.getSeconds() / 60).toFixed(3));
  };
  const set = (on, save = true) => {
    box.dataset.on = String(on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Hide clock' : 'Show clock');
    clearInterval(timer);
    if (on && (timeEl || secEl)) { tick(); timer = setInterval(tick, 1000); }
    if (save) try { localStorage.setItem(key, on ? '1' : '0'); } catch {}
  };
  btn.addEventListener('click', () => set(box.dataset.on !== 'true'));
  player?.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) set(box.dataset.on !== 'true');
  });
  let saved = null; try { saved = localStorage.getItem(key); } catch {}
  set(saved === null ? box.dataset.clockDefault === 'on' : saved === '1', false);
}
