import Hls from 'hls.js';

export function setupHls(video: HTMLVideoElement, src: string): void {
  if (Hls.isSupported()) {
    const config: Hls.Config = {
      debug: true,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
    };
    const hls = new Hls(config);
    hls.loadSource(src);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
  } else {
    console.error('HLS not supported in this browser');
  }
}