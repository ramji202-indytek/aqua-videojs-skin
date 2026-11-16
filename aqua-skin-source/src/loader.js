import '@videojs/html/media/youtube-video';
import '@videojs/html/media/hls-video';

// "Try your own video": YouTube links, direct video links (.mp4/.webm/.m3u8) and local files.
const form = document.getElementById('loader-form');
if (form) {
  const input = document.getElementById('loader-url');
  const fileInput = document.getElementById('loader-file');
  const fileBtn = document.getElementById('loader-file-btn');
  const resetBtn = document.getElementById('loader-reset');
  const status = document.getElementById('loader-status');
  const container = document.querySelector('media-container');
  const demoPoster = container.querySelector('.slate-poster')?.innerHTML ?? '';
  const demoTrack = container.querySelector('video track')?.outerHTML ?? '';
  let blobUrl = null;

  const say = (msg, isError = false) => {
    status.textContent = msg;
    status.dataset.error = isError ? 'true' : 'false';
  };

  const isYouTube = (s) =>
    /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(s) ||
    /^[\w-]{11}$/.test(s);

  function mount(kind, src) {
    const old = container.querySelector('video, youtube-video, hls-video');
    const el = document.createElement(kind);
    if (kind !== 'youtube-video') el.setAttribute('playsinline', '');
    el.setAttribute('src', src);
    if (kind === 'video') el.setAttribute('preload', 'metadata');
    el.addEventListener('error', () => say('That video could not be played. Check the link or try another file.', true));
    old.replaceWith(el);
    const poster = container.querySelector('.slate-poster');
    if (poster) poster.replaceChildren();
    return el;
  }

  function load(raw) {
    const value = raw.trim();
    if (!value) return say('Paste a link or choose a file first.', true);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    if (isYouTube(value)) {
      mount('youtube-video', value);
      return say('Loaded a YouTube video. Press play. (Picture-in-picture and YouTube captions depend on YouTube.)');
    }
    let url;
    try { url = new URL(value); } catch { return say('That does not look like a link. Use a full https:// address or a YouTube link.', true); }
    if (!/^https?:$/.test(url.protocol)) return say('Only http(s) links are supported.', true);
    mount(/\.m3u8($|\?)/i.test(url.pathname + url.search) ? 'hls-video' : 'video', url.href);
    say('Loaded. If it does not play, the host may block embedding; try a file instead.');
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); load(input.value); });

  fileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      return say('Choose a video file (.mp4, .webm, .mov).', true);
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(file);
    mount('video', blobUrl);
    input.value = '';
    say(`Loaded ${file.name} from your device. It stays on your computer.`);
  });

  resetBtn.addEventListener('click', () => {
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    const ds = container.dataset.demoSrc || 'slate-demo.mp4';
    const el = mount(/\.m3u8($|\?)/i.test(ds) ? 'hls-video' : 'video', ds);
    if (demoTrack) el.insertAdjacentHTML('beforeend', demoTrack);
    container.querySelector('.slate-poster').innerHTML = demoPoster;
    input.value = '';
    say('Back to the demo video.');
  });

  const fromQuery = new URLSearchParams(location.search).get('src');
  if (fromQuery) { input.value = fromQuery; load(fromQuery); }
}
