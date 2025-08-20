export interface JoinRoomPayload {
  roomId: string;
  deviceId: string;
  isController?: boolean;
  token?: string;
}

export interface TvStatePayload {
  rtt: number;
  offset: number;
  ready: boolean;
  drift: number;
}

export interface PlayAtPayload {
  epochMs: number;
}

export interface ChangeSrcPayload {
  src: string;
  type: 'mp4' | 'hls';
}

export interface SeekPayload {
  time: number;
}

export interface RatePayload {
  rate: number;
}

export interface MutePayload {
  muted: boolean;
}

export interface RoomState {
  src: string;
  type: 'mp4' | 'hls';
  epochScheduled?: number;
  readyThreshold: number;
  tvs: Record<string, TvStatePayload>;
}