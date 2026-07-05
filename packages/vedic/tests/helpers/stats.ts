/** Shared accuracy-reporting helpers for fixture-driven ephemeris tests. */

/** Signed angular difference a − b, wrapped into [−180, 180). */
export function angleDiff(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

export interface ErrorStats {
  count: number;
  maxAbsDeg: number;
  meanAbsDeg: number;
}

export function errorStats(errorsDeg: number[]): ErrorStats {
  const abs = errorsDeg.map(Math.abs);
  return {
    count: abs.length,
    maxAbsDeg: Math.max(...abs),
    meanAbsDeg: abs.reduce((sum, e) => sum + e, 0) / abs.length,
  };
}

/** Print a one-line accuracy report so drift is visible in CI logs. */
export function reportStats(label: string, stats: ErrorStats): void {
  const toArcsec = (deg: number) => (deg * 3600).toFixed(2);
  console.log(
    `[accuracy] ${label}: n=${stats.count}` +
      ` max=${toArcsec(stats.maxAbsDeg)}″ mean=${toArcsec(stats.meanAbsDeg)}″`,
  );
}
