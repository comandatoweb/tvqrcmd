import { connectSocket, joinRoom, onRoomState, sendPlayAt, sendPause, sendSeek, sendChangeSrc, sendRate, sendMute } from '../lib/socket';
import { generateQr } from '../lib/qr';
import { getDeviceId } from '../lib/device';

export function initControllerPage(root: HTMLElement, roomId: string, token?: string): void {
  root.innerHTML = `
    <div class="max-w-4xl mx-auto p-4 space-y-4">
      <div class="flex items-center space-x-2">
        <input id="src" class="border p-1 flex-1" placeholder="Video URL" />
        <select id="type" class="border p-1">
          <option value="mp4">MP4</option>
          <option value="hls">HLS</option>
        </select>
        <button id="load" class="bg-green-500 text-white px-2 py-1 rounded">Cargar</button>
      </div>
      <div class="space-x-2">
        <button id="playAt" class="bg-blue-500 text-white px-2 py-1 rounded">Programar inicio</button>
        <button id="pause" class="bg-red-500 text-white px-2 py-1 rounded">Pausar</button>
        <button id="resume" class="bg-blue-700 text-white px-2 py-1 rounded">Reanudar</button>
        <button id="forceStart" class="bg-yellow-500 text-black px-2 py-1 rounded">Forzar inicio</button>
      </div>
      <div class="flex items-center space-x-4">
        <label class="flex items-center">Seek:
          <input id="seek" type="range" min="0" max="0" step="0.1" class="w-64 mx-2" />
        </label>
        <label class="flex items-center">Rate:
          <input id="rate" type="range" min="0.5" max="2" step="0.1" value="1" class="mx-2" />
        </label>
        <label class="flex items-center">Mute:
          <input id="mute" type="checkbox" class="mx-2" />
        </label>
      </div>
      <table class="min-w-full bg-white">
        <thead>
          <tr class="bg-gray-200">
            <th class="px-2 py-1">Device</th>
            <th class="px-2 py-1">RTT(ms)</th>
            <th class="px-2 py-1">Offset(ms)</th>
            <th class="px-2 py-1">Ready</th>
            <th class="px-2 py-1">Drift(ms)</th>
          </tr>
        </thead>
        <tbody id="tv-list"></tbody>
      </table>
    </div>
  `;
  const socket = connectSocket();
  socket.on('error', (err) => {
    console.error('[Controller] socket error:', err);
    alert('Socket error: ' + err);
  });
  const deviceId = getDeviceId();
  joinRoom({ roomId, deviceId, isController: true, token });

  const srcInput = document.getElementById('src') as HTMLInputElement;
  const typeSelect = document.getElementById('type') as HTMLSelectElement;
  const seekInput = document.getElementById('seek') as HTMLInputElement;
  const rateInput = document.getElementById('rate') as HTMLInputElement;
  const muteInput = document.getElementById('mute') as HTMLInputElement;

  document.getElementById('load')!.onclick = () => {
    console.log('[Controller] sendChangeSrc →', srcInput.value, typeSelect.value);
    sendChangeSrc({ src: srcInput.value, type: typeSelect.value as 'mp4' | 'hls' });
  };
  document.getElementById('playAt')!.onclick = () => {
    const epochMs = Date.now() + 4000;
    sendPlayAt({ epochMs });
  };
  document.getElementById('pause')!.onclick = () => sendPause();
  document.getElementById('resume')!.onclick = () => sendPlayAt({ epochMs: Date.now() });
  document.getElementById('forceStart')!.onclick = () => sendPlayAt({ epochMs: Date.now() + 100 });
  seekInput.onchange = () => sendSeek({ time: parseFloat(seekInput.value) });
  rateInput.onchange = () => sendRate({ rate: parseFloat(rateInput.value) });
  muteInput.onchange = () => sendMute({ muted: muteInput.checked });

  onRoomState((state) => updateState(state, srcInput, typeSelect, seekInput));
}

function updateState(state: any, srcInput: HTMLInputElement, typeSelect: HTMLSelectElement, seekInput: HTMLInputElement) {
  srcInput.value = state.src;
  typeSelect.value = state.type;
  seekInput.max = state.readyThreshold.toString();
  const tbody = document.getElementById('tv-list')!;
  tbody.innerHTML = '';
  Object.entries(state.tvs).forEach(([id, tv]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${id}</td>
      <td class="border px-2 py-1">${tv.rtt.toFixed(0)}</td>
      <td class="border px-2 py-1">${tv.offset.toFixed(0)}</td>
      <td class="border px-2 py-1">${tv.ready}</td>
      <td class="border px-2 py-1">${tv.drift.toFixed(0)}</td>
    `;
    tbody.appendChild(tr);
  });
}
