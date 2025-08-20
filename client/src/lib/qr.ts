import QRCode from 'qrcode';

export function generateQr(canvas: HTMLCanvasElement, text: string): void {
  QRCode.toCanvas(canvas, text, { width: 128 }, (err) => {
    if (err) console.error(err);
  });
}