/* URL options for embedding AQUA as a channel (used by Insta Cloud TV):
   ?playlist=<url>,<url>,...  (each URL encoded)   clips play in order
   &loop=1      repeat the playlist (or the single clip)
   &logo=TEXT   channel logo text (max 16 chars)
   &clock=1|0   clock on or off                                         */
(() => {
  const q = new URLSearchParams(location.search);
  const raw = q.get('playlist');
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  const logo = q.get('logo');
  if (logo !== null) { const t = logo.trim().slice(0, 16); put('aqua-logo-text', t); put('aqua-logo-on', t ? '1' : '0'); }
  const clock = q.get('clock');
  if (clock !== null) { const key = document.querySelector('[data-clock-key]')?.dataset.clockKey || 'clock'; put(key, clock === '0' ? '0' : '1'); }

  if (!raw) return;
  const list = raw.split(',').map((s) => { try { return decodeURIComponent(s.trim()); } catch { return ''; } })
    .filter((s) => { try { return /^https?:$/.test(new URL(s).protocol); } catch { return false; } }).slice(0, 50);
  if (!list.length) return;
  const loop = q.get('loop') === '1';
  const container = document.querySelector('media-container'); if (!container) return;
  const kindOf = (u) => /\.m3u8($|\?)/i.test(new URL(u).pathname + new URL(u).search) ? 'hls-video'
    : /(youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(u) ? 'youtube-video' : 'video';

  let i = 0, fails = 0;
  function play(n, auto) {
    i = n;
    const old = container.querySelector('video, youtube-video, hls-video'); if (!old) return;
    const kind = kindOf(list[i]);
    const el = document.createElement(kind);
    if (kind !== 'youtube-video') { el.setAttribute('playsinline', ''); el.setAttribute('crossorigin', 'anonymous'); }
    el.setAttribute('src', list[i]);
    if (list.length === 1 && loop && kind === 'video') el.loop = true;
    el.addEventListener('error', () => { if (++fails < list.length) next(); });
    el.addEventListener('playing', () => { fails = 0; });
    old.replaceWith(el);
    container.querySelector('.slate-poster')?.replaceChildren();
    if (auto) setTimeout(() => { try { el.play?.(); } catch {} }, 150);
  }
  function next() {
    if (i + 1 < list.length) play(i + 1, true);
    else if (loop) play(0, true);
  }
  container.addEventListener('ended', next, true);
  play(0, false);
})();
