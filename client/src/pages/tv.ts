import { connectSocket, sendTvState } from '../lib/socket';
import { measureNtpOffset } from '../lib/ntp';
import { setupHls } from '../lib/hls';
import { generateQr } from '../lib/qr';
import { controlDrift } from '../lib/drift';
import { getDeviceId } from '../lib/device';

declare global {
  interface Window {
    tvSyncInterval?: number;
  }
}

export async function initTvPage(root: HTMLElement, roomId: string): Promise<void> {
  let roomInfo: { src: string; type: 'mp4' | 'hls'; token: string; epochScheduled?: number };
  try {
    const res = await fetch(`/rooms/${roomId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    roomInfo = await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TV] fetch room info error:', err);
    root.innerHTML = `<div class="p-4 text-red-500">Error fetching room info: ${message}</div>`;
    return;
  }
  const controllerUrl = `${window.location.origin}/controller?room=${roomId}&token=${roomInfo.token}`;
  showQrOnly(root, controllerUrl);
  let video: HTMLVideoElement | undefined;
  console.log('[TV] initial source:', roomInfo.src, 'type:', roomInfo.type);
  if (roomInfo.src) {
    video = ensureVideo(root, controllerUrl);
    if (roomInfo.type === 'hls') {
      setupHls(video, roomInfo.src);
    } else {
      video.src = roomInfo.src;
      video.load();
    }
  }

  const socket = connectSocket();
  socket.on('error', (err) => {
    console.error('[TV] socket error:', err);
    alert('Socket error: ' + err);
  });
  console.log('[TV] initTvPage, joining room', roomId);
  const deviceId = getDeviceId();
  socket.emit('join_room', { roomId, deviceId, isController: false });

  const { offset, rtt } = await measureNtpOffset(socket);
  let startEpoch = roomInfo.epochScheduled || 0;

  socket.on('srv_cmd_playAt', ({ epochMs }) => {
    startEpoch = epochMs;
    video?.play();
  });
  socket.on('srv_cmd_pause', () => video?.pause());
  socket.on('srv_cmd_seek', ({ time }: { time: number }) => {
    if (video) video.currentTime = time;
  });
  socket.on('srv_cmd_changeSrc', ({ src, type }: { src: string; type: 'mp4' | 'hls' }) => {
    console.log('[TV] srv_cmd_changeSrc → src=', src, ' type=', type);
    startEpoch = Date.now() + offset;
    video = ensureVideo(root, controllerUrl);
    video.pause();
    if (type === 'hls') {
      setupHls(video, src);
    } else {
      video.src = src;
      video.load();
    }
    // Mantener siempre sin audio y en bucle tras cambiar la fuente
    video.muted = true;
    video.loop = true;
    // Log when metadata and data are loaded
    const v = video;
    v.addEventListener('loadedmetadata', () =>
      console.log('[TV] loadedmetadata, duration=', v.duration),
    );
    v.addEventListener('loadeddata', () => console.log('[TV] loadeddata'));
    v.addEventListener('canplay', () => console.log('[TV] canplay'));
  });
  socket.on('srv_cmd_rate', ({ rate }: { rate: number }) => {
    if (video) video.playbackRate = rate;
  });

  // Drift correction loop every 2s
  // Clear any existing interval to prevent duplicates
  if (window.tvSyncInterval) clearInterval(window.tvSyncInterval);
  window.tvSyncInterval = window.setInterval(() => {
    const now = Date.now() + offset;
    const expectedTime = startEpoch ? (now - startEpoch) / 1000 : 0;
    if (video) {
      const drift = expectedTime - video.currentTime;
      controlDrift(video, drift);
      const buffered =
        video.buffered.length > 0 ? video.buffered.end(0) - video.currentTime : 0;
      const ready = buffered >= 4;
      sendTvState({ rtt, offset, ready, drift });
    } else {
      sendTvState({ rtt, offset, ready: false, drift: 0 });
    }
  }, 2000);
}

function showQrOnly(root: HTMLElement, url: string): void {
  root.innerHTML = `
    <div class="flex items-center justify-center h-full">
      <canvas id="qr"></canvas>
    </div>
  `;
  const qrCanvas = document.getElementById('qr') as HTMLCanvasElement;
  generateQr(qrCanvas, url);
}

function ensureVideo(root: HTMLElement, url: string): HTMLVideoElement {
  let video = document.getElementById('video') as HTMLVideoElement | null;
  if (video) return video;
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full">
      <video id="video" class="w-full max-h-full bg-black" muted autoplay loop playsinline></video>
      <canvas id="qr" class="mt-4"></canvas>
    </div>
  `;
  video = document.getElementById('video') as HTMLVideoElement;
  const qrCanvas = document.getElementById('qr') as HTMLCanvasElement;
  generateQr(qrCanvas, url);
  // Ensure muted loop
  video.muted = true;
  video.loop = true;
  return video;
}
