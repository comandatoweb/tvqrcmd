let startTime = Date.now();
let startHrTime = process.hrtime.bigint();

export function serverNowMs(): number {
  const hrTime = process.hrtime.bigint();
  const elapsedMs = Number((hrTime - startHrTime) / BigInt(1e6));
  return startTime + elapsedMs;
}