import type { Socket } from 'socket.io-client';

interface Sample {
  offset: number;
  rtt: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function measureNtpOffset(socket: Socket): Promise<{ offset: number; rtt: number }> {
  const samples: Sample[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    const clientSend = t0;
    await new Promise<void>((resolve) => {
      socket.once('ntp_pong', ({ serverSend }: { clientSend: number; serverSend: number }) => {
        const t1 = Date.now();
        const rtt = t1 - t0;
        const offset = serverSend - (t0 + rtt / 2);
        samples.push({ offset, rtt });
        resolve();
      });
      socket.emit('ntp_ping', { clientSend });
    });
    await delay(120);
  }
  const offsets = samples.map((s) => s.offset).sort((a, b) => a - b);
  const q1 = offsets[Math.floor(samples.length * 0.25)];
  const q3 = offsets[Math.floor(samples.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = samples.filter((s) => s.offset >= q1 - 1.5 * iqr && s.offset <= q3 + 1.5 * iqr);
  const chosen = filtered.length > 0 ? filtered : samples;
  return {
    offset: average(chosen.map((s) => s.offset)),
    rtt: average(chosen.map((s) => s.rtt)),
  };
}
