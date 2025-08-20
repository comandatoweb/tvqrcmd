import { initTvPage } from './pages/tv';
import { initControllerPage } from './pages/controller';

export function route(root: HTMLElement): void {
  const url = new URL(window.location.href);
  const path = window.location.pathname;
  const room = url.searchParams.get('room');
  const token = url.searchParams.get('token') || undefined;
  if (path === '/tv' && room) {
    initTvPage(root, room);
  } else if (path === '/controller' && room) {
    initControllerPage(root, room, token);
  } else {
    initHome(root);
  }
}

function initHome(root: HTMLElement): void {
  root.innerHTML = `
  <div class="max-w-md mx-auto mt-10 text-center">
    <h1 class="text-2xl mb-4">QR TV Sync</h1>
    <button id="create" class="bg-blue-500 text-white px-4 py-2 rounded">Create Room</button>
  </div>
  `;
  const createBtn = document.getElementById('create') as HTMLButtonElement | null;
  if (!createBtn) return;
  createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    try {
      const res = await fetch('/rooms', { method: 'POST' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const { roomId, token } = await res.json();
      window.location.href = `/controller?room=${roomId}&token=${token}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Home] create room error:', err);
      alert('Error creating room: ' + message);
    } finally {
      createBtn.disabled = false;
    }
  });
}
