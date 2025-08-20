export function controlDrift(video: HTMLVideoElement, drift: number): void {
  const abs = Math.abs(drift);
  if (abs < 0.12) {
    video.playbackRate = 1 + drift / 1.5;
  } else if (abs < 0.4) {
    video.currentTime += drift * 0.6;
  } else {
    video.currentTime = video.currentTime + drift;
    video.pause();
    setTimeout(() => video.play(), 500);
  }
}