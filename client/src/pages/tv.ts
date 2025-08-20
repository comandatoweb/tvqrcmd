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
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full">
      <canvas id="qr" class="mt-4"></canvas>
    </div>
  `;
  const qrCanvas = document.getElementById('qr') as HTMLCanvasElement;

  function ensureVideo(): HTMLVideoElement {
    let video = document.getElementById('video') as HTMLVideoElement | null;
    if (!video) {
      video = document.createElement('video');
      video.id = 'video';
      video.className = 'w-full max-h-full bg-black';
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      qrCanvas.parentElement!.insertBefore(video, qrCanvas);
    }
    return video;
  }

  let roomInfo: { src: string; type: 'mp4' | 'hls'; token: string; epochScheduled?: number };
  try {
    const res = await fetch(`/rooms/${roomId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    roomInfo = await res.json();
  } catch (err: any) {
    console.error('[TV] fetch room info error:', err);
    root.innerHTML = `<div class="p-4 text-red-500">Error fetching room info: ${err.message || err}</div>`;
    return;
  }
  generateQr(qrCanvas, `${window.location.origin}/controller?room=${roomId}&token=${roomInfo.token}`);
  const video = ensureVideo();
  console.log('[TV] initial source:', roomInfo.src, 'type:', roomInfo.type);
  if (roomInfo.type === 'hls') {
    setupHls(video, roomInfo.src);
  } else {
    video.src = roomInfo.src;
    video.load();
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
    video.play();
  });
  socket.on('srv_cmd_pause', () => video.pause());
  socket.on('srv_cmd_seek', ({ time }) => {
    video.currentTime = time;
  });
  socket.on('srv_cmd_changeSrc', ({ src, type }) => {
    console.log('[TV] srv_cmd_changeSrc → src=', src, ' type=', type);
    startEpoch = Date.now() + offset;
    video.pause();
    if (type === 'hls') {
      setupHls(video, src);
    } else {
      video.src = src;
      video.load();
    }
    video.muted = true;
    video.loop = true;
    video.addEventListener('loadedmetadata', () => console.log('[TV] loadedmetadata, duration=', video.duration));
    video.addEventListener('loadeddata', () => console.log('[TV] loadeddata'));
    video.addEventListener('canplay', () => console.log('[TV] canplay'));
  });
  socket.on('srv_cmd_rate', ({ rate }: { rate: number }) => {
    video.playbackRate = rate;
  });

  // Drift correction loop every 2s
  if (window.tvSyncInterval) clearInterval(window.tvSyncInterval);
  window.tvSyncInterval = window.setInterval(() => {
    const now = Date.now() + offset;
    const expectedTime = startEpoch ? (now - startEpoch) / 1000 : 0;
    const drift = expectedTime - video.currentTime;
    controlDrift(video, drift);
    const buffered = video.buffered.length > 0 ? video.buffered.end(0) - video.currentTime : 0;
    const ready = buffered >= 4;
    sendTvState({ rtt, offset, ready, drift });
  }, 2000);
}

// Device ID helper moved to lib/device.ts

