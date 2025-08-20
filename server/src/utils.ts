/**
 * Validate that a video src URL matches the expected type (MP4 or HLS).
 */
export function isValidSrc(src: string, type: 'mp4' | 'hls'): boolean {
  try {
    const url = new URL(src);
    // only allow http(s)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    const path = url.pathname.toLowerCase();
    if (type === 'mp4' && !path.endsWith('.mp4')) {
      return false;
    }
    if (type === 'hls' && !path.endsWith('.m3u8')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}