import path from 'path';
import dotenv from 'dotenv';

// Carga variables de entorno desde el .env de la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** Puerto donde escucha el servidor. */
export const PORT = Number(process.env.PORT) || 3000;

/** URL pública del cliente (usada en CORS y en producción). */
export const PUBLIC_URL = process.env.PUBLIC_URL || '';

/** Fuente por defecto al crear nuevas salas. */
export const DEFAULT_SRC = process.env.DEFAULT_SRC || '';

/** Entorno de ejecución ('development' o 'production'). */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/** Time-to-live for rooms in milliseconds; idle rooms older than this are purged. */
export const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS) || 3600000;

/** Time‑to‑live for rooms (ms). After this time idle rooms are cleaned up. */
export const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS) || 3600000;