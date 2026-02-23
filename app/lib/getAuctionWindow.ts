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

function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  const weekday = map.weekday;

  return { year, month, day, hour, minute, second, weekday };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const p = getZonedParts(date, timeZone);
  const asIfUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asIfUTC - date.getTime()) / 60000;
}

function londonWallTimeToDateUTC(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Pass 1
  let offset = getTimeZoneOffsetMinutes(guess, LONDON_TZ);
  guess = new Date(guess.getTime() - offset * 60000);

  // Pass 2 (stabilise around DST boundaries)
  offset = getTimeZoneOffsetMinutes(guess, LONDON_TZ);
  guess = new Date(guess.getTime() - offset * 60000);

  return guess;
}

function addDaysToYMD(year: number, month: number, day: number, addDays: number) {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // noon UTC
  d.setUTCDate(d.getUTCDate() + addDays);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
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

export function getAuctionWindow(now: Date = new Date()): AuctionWindow {
  const londonNow = getZonedParts(now, LONDON_TZ);
  const isoWeekday = weekdayToISO(londonNow.weekday);

  // This week's Monday (London calendar date)
  const mondayYMD = addDaysToYMD(londonNow.year, londonNow.month, londonNow.day, -(isoWeekday - 1));

  // Monday 01:00 London for this week
  const thisWeekMonday01 = londonWallTimeToDateUTC(
    mondayYMD.year,
    mondayYMD.month,
    mondayYMD.day,
    1,
    0,
    0
  );

  // If now is before this week's Monday 01:00 London, current window is last week
  const currentStart =
    now.getTime() < thisWeekMonday01.getTime()
      ? (() => {
          const prevMondayYMD = addDaysToYMD(mondayYMD.year, mondayYMD.month, mondayYMD.day, -7);
          return londonWallTimeToDateUTC(prevMondayYMD.year, prevMondayYMD.month, prevMondayYMD.day, 1, 0, 0);
        })()
      : thisWeekMonday01;

  // Current end = Sunday 23:00 of currentStart's week (London calendar)
  const currentStartLondon = getZonedParts(currentStart, LONDON_TZ);
  const startMondayYMD = addDaysToYMD(
    currentStartLondon.year,
    currentStartLondon.month,
    currentStartLondon.day,
    0
  );

  const sundayYMD = addDaysToYMD(startMondayYMD.year, startMondayYMD.month, startMondayYMD.day, 6);
  const currentEnd = londonWallTimeToDateUTC(sundayYMD.year, sundayYMD.month, sundayYMD.day, 23, 0, 0);

  // Next window
  const nextMondayYMD = addDaysToYMD(startMondayYMD.year, startMondayYMD.month, startMondayYMD.day, 7);
  const nextStart = londonWallTimeToDateUTC(nextMondayYMD.year, nextMondayYMD.month, nextMondayYMD.day, 1, 0, 0);

  const nextSundayYMD = addDaysToYMD(nextMondayYMD.year, nextMondayYMD.month, nextMondayYMD.day, 6);
  const nextEnd = londonWallTimeToDateUTC(nextSundayYMD.year, nextSundayYMD.month, nextSundayYMD.day, 23, 0, 0);

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