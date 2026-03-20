// app/lib/getAuctionWindow.ts

export type AuctionWindow = {
  /** The Date the window was calculated from */
  now: Date;

  /** Current auction window start (UK-local Monday 01:00, returned as a real Date) */
  currentStart: Date;

  /** Current auction window end (UK-local Sunday 23:00, returned as a real Date) */
  currentEnd: Date;

  /** Next auction window start (UK-local Monday 01:00, returned as a real Date) */
  nextStart: Date;

  /** Next auction window end (UK-local Sunday 23:00, returned as a real Date) */
  nextEnd: Date;

  /** True when now is within the current live window (>= start and <= end) */
  isLive: boolean;

  /** True when now is before the current window start (i.e. "coming soon" for this week) */
  isComing: boolean;
};

const LONDON_TZ = "Europe/London";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    weekday: "short",
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};

  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday || "",
  };
}

function addDaysToYMD(year: number, month: number, day: number, addDays: number) {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // noon UTC avoids date-edge weirdness
  d.setUTCDate(d.getUTCDate() + addDays);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function weekdayToISO(weekdayShort: string) {
  const w = weekdayShort.trim().toLowerCase();
  if (w.startsWith("mon")) return 1;
  if (w.startsWith("tue")) return 2;
  if (w.startsWith("wed")) return 3;
  if (w.startsWith("thu")) return 4;
  if (w.startsWith("fri")) return 5;
  if (w.startsWith("sat")) return 6;
  return 7; // Sun
}

/**
 * Convert a London wall-clock time (e.g. 2026-03-29 23:00 London)
 * into the real UTC Date that represents that instant.
 *
 * This iterative approach is reliable across DST changes.
 */
function londonWallTimeToDateUTC(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
) {
  // Start by pretending the London wall time is UTC.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Iteratively correct until the London-local parts match the requested wall time.
  for (let i = 0; i < 6; i++) {
    const actual = getZonedParts(guess, LONDON_TZ);

    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );

    const diffMs = wantedAsUtc - actualAsUtc;

    if (diffMs === 0) return guess;

    guess = new Date(guess.getTime() + diffMs);
  }

  return guess;
}

export function getAuctionWindow(now: Date = new Date()): AuctionWindow {
  const londonNow = getZonedParts(now, LONDON_TZ);
  const isoWeekday = weekdayToISO(londonNow.weekday);

  // Calendar Monday for "this week" in London
  const thisMondayYMD = addDaysToYMD(
    londonNow.year,
    londonNow.month,
    londonNow.day,
    -(isoWeekday - 1)
  );

  // Monday 01:00 London for this week
  const thisWeekMonday01 = londonWallTimeToDateUTC(
    thisMondayYMD.year,
    thisMondayYMD.month,
    thisMondayYMD.day,
    1,
    0,
    0
  );

  // If we're before this week's Monday 01:00 London, current window is last week
  const currentStartYMD =
    now.getTime() < thisWeekMonday01.getTime()
      ? addDaysToYMD(thisMondayYMD.year, thisMondayYMD.month, thisMondayYMD.day, -7)
      : thisMondayYMD;

  const currentStart = londonWallTimeToDateUTC(
    currentStartYMD.year,
    currentStartYMD.month,
    currentStartYMD.day,
    1,
    0,
    0
  );

  const currentEndYMD = addDaysToYMD(
    currentStartYMD.year,
    currentStartYMD.month,
    currentStartYMD.day,
    6
  );

  const currentEnd = londonWallTimeToDateUTC(
    currentEndYMD.year,
    currentEndYMD.month,
    currentEndYMD.day,
    23,
    0,
    0
  );

  const nextStartYMD = addDaysToYMD(
    currentStartYMD.year,
    currentStartYMD.month,
    currentStartYMD.day,
    7
  );

  const nextStart = londonWallTimeToDateUTC(
    nextStartYMD.year,
    nextStartYMD.month,
    nextStartYMD.day,
    1,
    0,
    0
  );

  const nextEndYMD = addDaysToYMD(
    nextStartYMD.year,
    nextStartYMD.month,
    nextStartYMD.day,
    6
  );

  const nextEnd = londonWallTimeToDateUTC(
    nextEndYMD.year,
    nextEndYMD.month,
    nextEndYMD.day,
    23,
    0,
    0
  );

  const isLive = now.getTime() >= currentStart.getTime() && now.getTime() <= currentEnd.getTime();
  const isComing = now.getTime() < currentStart.getTime();

  return {
    now,
    currentStart,
    currentEnd,
    nextStart,
    nextEnd,
    isLive,
    isComing,
  };
}