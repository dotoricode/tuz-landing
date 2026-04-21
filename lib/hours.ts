/**
 * "Open now" detection, ported from the legacy vanilla site.
 * Parses "HH:MM-HH:MM" ranges and compares against the current time in
 * `Asia/Seoul`. Overnight ranges (close < open) are supported.
 */

export type HourRange = { startMin: number; endMin: number };

const HHMM = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

export function parseRange(input: string | null | undefined): HourRange | null {
  if (!input) return null;
  const m = HHMM.exec(input.trim());
  if (!m) return null;
  const [, sH, sM, eH, eM] = m;
  const startMin = Number(sH) * 60 + Number(sM);
  const endMin = Number(eH) * 60 + Number(eM);
  return { startMin, endMin };
}

/**
 * Compute the current minute-of-day in Asia/Seoul regardless of the server's
 * local timezone. Avoids hydration mismatch by centralizing the computation.
 */
export function seoulNow(now: Date = new Date()): {
  dayOfWeek: number; // 0 = Sunday
  minuteOfDay: number;
} {
  // `sv-SE` gives YYYY-MM-DD HH:MM:SS which is trivial to split
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(byType.hour ?? "0");
  const minute = Number(byType.minute ?? "0");
  // Map weekday short names (en-style from sv-SE: 'mån','tis'...) to numbers
  // reliably by constructing a Date in Seoul from the parts.
  const seoulDate = new Date(
    `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}:${byType.second}+09:00`,
  );
  return {
    dayOfWeek: seoulDate.getUTCDay(),
    minuteOfDay: hour * 60 + minute,
  };
}

/**
 * Is the shop currently open?
 * Minute-of-day is compared against the matching weekday/weekend range.
 * Overnight ranges (end <= start) are treated as wrapping past midnight.
 */
export function isOpenNow({
  weekdayRange,
  weekendRange,
  now = new Date(),
}: {
  weekdayRange: string | null | undefined;
  weekendRange: string | null | undefined;
  now?: Date;
}): boolean {
  const { dayOfWeek, minuteOfDay } = seoulNow(now);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const range = parseRange(isWeekend ? weekendRange : weekdayRange);
  if (!range) return false;
  const { startMin, endMin } = range;
  if (endMin > startMin) {
    return minuteOfDay >= startMin && minuteOfDay < endMin;
  }
  // Overnight wrap (e.g. 22:00-02:00)
  return minuteOfDay >= startMin || minuteOfDay < endMin;
}
