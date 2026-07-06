/**
 * Input guards for the public API boundary. Every failure is a
 * `RangeError` that names the offending value — garbage never
 * propagates silently into NaN results.
 */

/**
 * Throw unless `value` is a finite number.
 *
 * @throws RangeError naming the parameter and the value received
 * @example
 * ```ts
 * assertFinite(2451545, 'jdUt'); // passes
 * ```
 */
export function assertFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(
      `${name} must be a finite number, got ${String(value)}`,
    );
  }
}

/**
 * Throw unless `latitude` is a finite number within ±90°.
 *
 * @throws RangeError
 * @example
 * ```ts
 * assertLatitude(27.7172); // passes
 * ```
 */
export function assertLatitude(latitude: number): void {
  assertFinite(latitude, 'latitude');
  if (latitude < -90 || latitude > 90) {
    throw new RangeError(`latitude must be within [-90, 90], got ${latitude}`);
  }
}

/**
 * Throw unless `longitude` is a finite number within ±180°.
 *
 * @throws RangeError
 * @example
 * ```ts
 * assertLongitude(85.324); // passes
 * ```
 */
export function assertLongitude(longitude: number): void {
  assertFinite(longitude, 'longitude');
  if (longitude < -180 || longitude > 180) {
    throw new RangeError(
      `longitude must be within [-180, 180], got ${longitude}`,
    );
  }
}

/**
 * Throw unless `date` is a `Date` holding a real instant
 * (`new Date(NaN)` and non-Dates are rejected).
 *
 * @throws RangeError
 * @example
 * ```ts
 * assertValidDate(new Date('2026-07-02T00:00:00Z')); // passes
 * ```
 */
export function assertValidDate(date: Date, name = 'date'): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid Date, got ${String(date)}`);
  }
}

/**
 * Throw unless year/month/day are integers forming a plausible civil
 * date (month 1–12, day 1–31; real month lengths are the caller's
 * domain).
 *
 * @throws RangeError
 * @example
 * ```ts
 * assertCivilDate(2026, 7, 2); // passes
 * ```
 */
export function assertCivilDate(
  year: number,
  month: number,
  day: number,
): void {
  for (const [value, name] of [
    [year, 'year'],
    [month, 'month'],
    [day, 'day'],
  ] as const) {
    assertFinite(value, name);
    if (!Number.isInteger(value)) {
      throw new RangeError(`${name} must be an integer, got ${value}`);
    }
  }
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1-12, got ${month}`);
  }
  if (day < 1 || day > 31) {
    throw new RangeError(`day must be 1-31, got ${day}`);
  }
}
