# QR TV Sync

Multi-TV/browser video synchronization with remote control via QR and real-time drift correction. Achieves <±100ms sync between clients despite network latency.

## Features

- Server: Node.js 20, Express, Socket.IO
- Mini-NTP for clock sync (median of multiple pings)
- Real-time drift correction (playbackRate, micro-seek, hard seek)
- Support MP4 and HLS (.m3u8) via hls.js
- Controller UI: play/pause/seek/rate/mute/change source/programmed start
- TV UI: video playback, buffered readiness, QR code for controller link
- TypeScript, ESLint, Prettier
- Minimal UI using Tailwind CDN

## Project Structure

- `server/`: Backend server
- `client/`: Frontend application
- `README.md`, `.env.example`, and root config files

## Getting Started

1. Copy `.env.example` to `.env` and adjust environment variables:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run in development mode (server + client):

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

5. Start the production server:

   ```bash
   npm start
   ```

6. Open your browser to `http://localhost:3000` to access the UI.

## Environment Variables

| Variable      | Default                                                          | Description                        |
| ------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `PORT`        | `3000`                                                           | Server listening port              |
| `PUBLIC_URL`  | `http://localhost:5173`                                          | Client public URL (dev/prod base)  |
| `DEFAULT_SRC` | `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`              | Initial video source for new rooms |

## Usage

- Navigate to `/` and click "Create Room" to start a new session.
- Controller page URL and token are provided in the QR on TV screen.
- TVs join the same room automatically when loaded with `?room=<roomId>`.
- Controller can program start time, issue commands, and monitor TV statuses in real-time.

## License

MIT