// Audio meter + channel readout. Uses the Web Audio API on the playing <video>.
// Works for local files and same-origin / blob sources. It cannot read YouTube (cross-origin iframe)
// or remote files that do not send CORS headers, so the meter hides itself there.
const meterEl = document.querySelector('.slate-meter');
const container = document.querySelector('media-container');

if (meterEl && container && (window.AudioContext || window.webkitAudioContext)) {
  const labelEl = meterEl.querySelector('.slate-meter-label');
  const barsEl = meterEl.querySelector('.slate-meter-bars');
  const LAYOUTS = {
    1: ['M'], 2: ['L', 'R'], 3: ['L', 'R', 'C'], 4: ['L', 'R', 'Ls', 'Rs'],
    6: ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'], 8: ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lb', 'Rb'],
  };
  const NAMES = { 1: 'Mono', 2: 'Stereo', 6: '5.1', 8: '7.1' };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let ctx = null;
  const sources = new WeakMap(); // video -> MediaElementAudioSourceNode (one per element, ever)
  let run = 0;                   // increments to cancel stale loops/listeners

  const setState = (s) => { meterEl.dataset.state = s; };

  function mediaVideo(el) {
    if (!el) return null;
    if (el.tagName === 'VIDEO') return el;
    return el.nativeEl || el.shadowRoot?.querySelector('video') || el.querySelector?.('video') || null;
  }

  function usable(v) {
    try {
      const u = new URL(v.currentSrc || v.src, location.href);
      return u.protocol === 'blob:' || u.origin === location.origin;
    } catch { return false; }
  }

  function attach(el) {
    const token = ++run;
    setState('off');
    const v = mediaVideo(el);
    if (!v) return;
    const start = () => { if (token === run && usable(v)) build(v, token); };
    if (v.readyState >= 1) start(); else v.addEventListener('loadedmetadata', start, { once: true });
  }

  // Worklet: counts the channels that really arrive and reports per-channel peaks.
  const WORKLET = `
    class SlateMeter extends AudioWorkletProcessor {
      constructor() { super(); this.f = 0; this.pk = new Float32Array(8); }
      process(inputs) {
        const inp = inputs[0] || [];
        const ch = Math.min(inp.length, 8);
        for (let c = 0; c < ch; c++) {
          const d = inp[c]; let m = this.pk[c];
          for (let i = 0; i < d.length; i++) { const x = Math.abs(d[i]); if (x > m) m = x; }
          this.pk[c] = m;
        }
        if (++this.f >= 6) {
          this.port.postMessage({ ch, peaks: Array.from(this.pk) });
          this.pk.fill(0); this.f = 0;
        }
        return true;
      }
    }
    registerProcessor('slate-meter', SlateMeter);`;
  let workletReady = null;
  const ensureWorklet = () => workletReady ||= ctx.audioWorklet.addModule(
    URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })),
  );

  const nodes = new WeakMap(); // video -> worklet node

  async function build(v, token) {
    if (!window.AudioWorkletNode || !window.isSecureContext) return;
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    let src = sources.get(v);
    if (!src) {
      try { src = ctx.createMediaElementSource(v); } catch { return; }
      src.connect(ctx.destination); // keep audio audible
      sources.set(v, src);
    }
    try { await ensureWorklet(); } catch { return; }
    if (token !== run) return;

    let node = nodes.get(v);
    if (!node) {
      node = new AudioWorkletNode(ctx, 'slate-meter', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
        channelCount: 8, channelCountMode: 'max', channelInterpretation: 'discrete',
      });
      const mute = ctx.createGain(); mute.gain.value = 0;
      src.connect(node); node.connect(mute); mute.connect(ctx.destination);
      nodes.set(v, node);
    }

    let count = 0, bars = [], levels = [], peaks = [], lastDraw = 0;
    const layoutFor = (n) => LAYOUTS[n] || Array.from({ length: n }, (_, i) => String(i + 1));
    const render = (n) => {
      count = n;
      levels = new Array(n).fill(0); peaks = new Array(n).fill(0);
      barsEl.replaceChildren(...layoutFor(n).map((nm) => {
        const b = document.createElement('span');
        b.className = 'slate-meter-bar'; b.title = nm;
        b.innerHTML = '<i class="fill"></i><i class="peak"></i>';
        return b;
      }));
      bars = [...barsEl.children];
      const nice = NAMES[n] || `${n} ch`;
      labelEl.textContent = NAMES[n] ? nice : `${n} CH`;
      meterEl.setAttribute('aria-label', `Audio: ${nice}${NAMES[n] && n > 2 ? ` (${n} channels)` : n === 1 ? ' (1 channel)' : ' (2 channels)'}`);
      setState('ready');
    };

    node.port.onmessage = (e) => {
      if (token !== run) return;
      const { ch, peaks: pk } = e.data;
      if (ch > 0 && ch !== count) render(ch);
      if (!count) return;
      for (let i = 0; i < count; i++) {
        const m = ch > 0 ? pk[i] || 0 : 0;
        const db = m > 0 ? 20 * Math.log10(m) : -90;
        const lvl = Math.min(1, Math.max(0, (db + 60) / 60));
        levels[i] = Math.max(lvl, levels[i] - 0.035);
        peaks[i] = lvl >= peaks[i] ? lvl : Math.max(levels[i], peaks[i] - 0.01);
      }
      const now = performance.now();
      if (reduceMotion.matches && now - lastDraw < 150) return;
      lastDraw = now;
      for (let i = 0; i < count; i++) {
        bars[i].style.setProperty('--lvl', levels[i].toFixed(3));
        bars[i].style.setProperty('--peak', peaks[i].toFixed(3));
        bars[i].dataset.hot = levels[i] > 0.92 ? 'true' : 'false';
      }
    };

    const onPlay = () => ctx.resume?.();
    v.addEventListener('play', onPlay);
    if (!v.paused) onPlay();
  }

  // Attach to whichever media element is in the container, now and after swaps.
  const pick = () => container.querySelector('video, youtube-video, hls-video');
  let currentEl = null;
  const check = () => { const el = pick(); if (el !== currentEl) { currentEl = el; attach(el); } };
  new MutationObserver(check).observe(container, { childList: true });
  check();
}
