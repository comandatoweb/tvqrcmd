import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createRoom, getRoom, Room } from './rooms';
import { serverNowMs } from './time';
import { isValidSrc } from './utils';
import { PORT, PUBLIC_URL, DEFAULT_SRC, NODE_ENV } from './config';
import {
  JoinRoomPayload,
  TvStatePayload,
  PlayAtPayload,
  ChangeSrcPayload,
  SeekPayload,
  RatePayload,
  MutePayload,
} from './types';

/**
 * Simple validation of source URL according to expected stream type.
 */
function isValidSrc(src: string, type: 'mp4' | 'hls'): boolean {
  try {
    const url = new URL(src);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const path = url.pathname.toLowerCase();
    if (type === 'mp4' && !path.endsWith('.mp4')) return false;
    if (type === 'hls' && !path.endsWith('.m3u8')) return false;
    return true;
  } catch {
    return false;
  }
}

// Puerto y URL pública configurados en server/src/config.ts
// const PORT = Number(process.env.PORT) || 3000;
// const PUBLIC_URL = process.env.PUBLIC_URL;

const app = express();
// Enable CORS: allow any origin in development, restrict in production to PUBLIC_URL
// Configuración de CORS: en producción restringe a PUBLIC_URL, en dev permite todo
app.use(cors({ origin: NODE_ENV === 'production' ? PUBLIC_URL : true }));
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/rooms', (_, res) => {
  const { roomId, token } = createRoom(DEFAULT_SRC, 4);
  res.json({ roomId, token });
});

app.get('/rooms/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ roomId: room.id, token: room.token, src: room.src, type: room.type });
});

if (NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: NODE_ENV === 'production' ? PUBLIC_URL : true },
});
const syncNs = io.of('/sync');

syncNs.on('connection', (socket) => {
  console.log('[Server] sync namespace connection:', socket.id);
  let currentRoom: Room | undefined;
  let deviceId: string;
  let isController = false;

  socket.on('join_room', (data: JoinRoomPayload) => {
    console.log('[Server] join_room:', data);
    const { roomId, deviceId: did, isController: ctrl, token } = data;
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (ctrl) {
      if (token !== room.token) {
        socket.emit('error', 'Invalid token');
        socket.disconnect();
        return;
      }
      isController = true;
    }
    deviceId = did;
    currentRoom = room;
    socket.join(roomId);
    broadcastRoomState(room);
  });

  socket.on('ntp_ping', (payload: { clientSend: number }) => {
    socket.emit('ntp_pong', { clientSend: payload.clientSend, serverSend: serverNowMs() });
  });

  socket.on('tv_state', (payload: TvStatePayload) => {
    if (currentRoom && !isController) {
      currentRoom.tvStates[deviceId] = {
        rtt: payload.rtt,
        offset: payload.offset,
        ready: payload.ready,
        drift: payload.drift,
      };
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_playAt', (payload: PlayAtPayload) => {
    if (currentRoom && isController) {
      currentRoom.epochScheduled = payload.epochMs;
      syncNs.to(currentRoom.id).emit('srv_cmd_playAt', payload);
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_pause', () => {
    if (currentRoom && isController) {
      syncNs.to(currentRoom.id).emit('srv_cmd_pause');
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_seek', (payload: SeekPayload) => {
    if (currentRoom && isController) {
      syncNs.to(currentRoom.id).emit('srv_cmd_seek', payload);
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_changeSrc', (payload: ChangeSrcPayload) => {
    if (currentRoom && isController) {
      // Validate incoming source and type
      if (!isValidSrc(payload.src, payload.type)) {
        socket.emit('error', 'Invalid source URL or type');
        return;
      }
      currentRoom.src  = payload.src;
      currentRoom.type = payload.type;
      console.log('[Server] cmd_changeSrc → broadcasting', payload);
      syncNs.to(currentRoom.id).emit('srv_cmd_changeSrc', payload);
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_rate', (payload: RatePayload) => {
    if (currentRoom && isController) {
      syncNs.to(currentRoom.id).emit('srv_cmd_rate', payload);
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('cmd_mute', (payload: MutePayload) => {
    if (currentRoom && isController) {
      syncNs.to(currentRoom.id).emit('srv_cmd_mute', payload);
      broadcastRoomState(currentRoom);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && !isController) {
      delete currentRoom.tvStates[deviceId];
      broadcastRoomState(currentRoom);
    }
  });

  function broadcastRoomState(room: Room) {
    syncNs.to(room.id).emit('srv_room_state', {
      src: room.src,
      type: room.type,
      epochScheduled: room.epochScheduled,
      readyThreshold: room.readyThreshold,
      tvs: room.tvStates,
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});