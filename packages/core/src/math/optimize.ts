/**
 * One-dimensional golden-section minimizer for the smooth, unimodal
 * objectives that event searches produce (shadow-axis distances,
 * disc separations). Internal helper — not part of the public API.
 */

const PHI = (Math.sqrt(5) - 1) / 2;

/**
 * Abscissa of the minimum of `f` on [lo, hi], to within `tolerance`.
 * `f` must be unimodal on the interval.
 */
export function goldenMinimize(
  f: (x: number) => number,
  lo: number,
  hi: number,
  tolerance: number,
): number {
  let a = hi - PHI * (hi - lo);
  let b = lo + PHI * (hi - lo);
  let fa = f(a);
  let fb = f(b);
  let left = lo;
  let right = hi;
  while (right - left > tolerance) {
    if (fa <= fb) {
      right = b;
      b = a;
      fb = fa;
      a = right - PHI * (right - left);
      fa = f(a);
    } else {
      left = a;
      a = b;
      fa = fb;
      b = left + PHI * (right - left);
      fb = f(b);
    }
  }
  return (left + right) / 2;
}
