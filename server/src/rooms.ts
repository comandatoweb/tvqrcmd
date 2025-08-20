import { v4 as uuidv4 } from 'uuid';
import { TvStatePayload } from './types';

export type StreamType = 'mp4' | 'hls';

export interface TvState {
  rtt: number;
  offset: number;
  ready: boolean;
  drift: number;
}

export interface Room {
  id: string;
  token: string;
  src: string;
  type: StreamType;
  tvStates: Record<string, TvState>;
  epochScheduled?: number;
  readyThreshold: number;
  createdAt: number;
}

const rooms = new Map<string, Room>();

/** Periodically purge rooms older than ROOM_TTL_MS to avoid memory leaks. */
import { ROOM_TTL_MS } from './config';
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      console.log('[Rooms] removing expired room', id);
      rooms.delete(id);
    }
  }
}, ROOM_TTL_MS);

export function createRoom(defaultSrc: string, readyThreshold = 4): { roomId: string; token: string } {
  const id = uuidv4();
  const token = uuidv4();
  const type: StreamType = defaultSrc.toLowerCase().endsWith('.m3u8') ? 'hls' : 'mp4';
  rooms.set(id, { id, token, src: defaultSrc, type, tvStates: {}, readyThreshold, createdAt: Date.now() });
  return { roomId: id, token };
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}