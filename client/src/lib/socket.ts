import { io, Socket } from 'socket.io-client';
import type {
  JoinRoomPayload,
  TvStatePayload,
  PlayAtPayload,
  ChangeSrcPayload,
  SeekPayload,
  RatePayload,
  MutePayload,
  RoomState,
} from '../types';

const socket: Socket = io('/sync');

export function connectSocket(): Socket {
  return socket;
}

export function joinRoom(payload: JoinRoomPayload): void {
  socket.emit('join_room', payload);
}

export function sendTvState(payload: TvStatePayload): void {
  socket.emit('tv_state', payload);
}

export function onRoomState(cb: (state: RoomState) => void): void {
  socket.on('srv_room_state', cb);
}

export function sendPlayAt(payload: PlayAtPayload): void {
  socket.emit('cmd_playAt', payload);
}

export function sendPause(): void {
  socket.emit('cmd_pause');
}

export function sendSeek(payload: SeekPayload): void {
  socket.emit('cmd_seek', payload);
}

export function sendChangeSrc(payload: ChangeSrcPayload): void {
  socket.emit('cmd_changeSrc', payload);
}

export function sendRate(payload: RatePayload): void {
  socket.emit('cmd_rate', payload);
}

export function sendMute(payload: MutePayload): void {
  socket.emit('cmd_mute', payload);
}