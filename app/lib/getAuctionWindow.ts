// lib/getAuctionWindow.ts

export type AuctionWindow = {
  now: Date;
  currentStart: Date; // Monday 01:00 of current/nearest auction week
  currentEnd: Date;   // Sunday 23:00 of that week
  nextStart: Date;    // Monday 01:00 of the following week
  nextEnd: Date;      // Sunday 23:00 of the following week
  isLive: boolean;    // true if now is between currentStart and currentEnd
};

/**
 * Helper: clone a date
 */
function clone(d: Date): Date {
  return new Date(d.getTime());
}

/**
 * Weekly auction:
 *  - START: Monday 01:00 (GMT)
 *  - END:   Sunday 23:00 (GMT)
 * All calculations are done in UTC/GMT to avoid timezone chaos.
 */
export function getAuctionWindow(referenceDate?: Date): AuctionWindow {
  const now = referenceDate ? new Date(referenceDate) : new Date();

  // "Today" at 00:00 UTC
  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat

  // How many days have passed since Monday?
  // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  // Monday 00:00 of "this" week
  const mondayMidnight = clone(today);
  mondayMidnight.setUTCDate(today.getUTCDate() - daysSinceMonday);

  // Monday 01:00 (auction start)
  const currentStart = clone(mondayMidnight);
  currentStart.setUTCHours(1, 0, 0, 0);

  // Sunday 23:00 (auction end) – 6 days and 22 hours after Monday 01:00
  const currentEnd = clone(currentStart);
  currentEnd.setUTCDate(currentEnd.getUTCDate() + 6); // +6 days = Sunday 01:00
  currentEnd.setUTCHours(23, 0, 0, 0); // 23:00 Sunday

  const nowTime = now.getTime();
  const isLive =
    nowTime >= currentStart.getTime() && nowTime <= currentEnd.getTime();

  // Next week’s window (always 7 days ahead of currentStart/currentEnd)
  const nextStart = clone(currentStart);
  nextStart.setUTCDate(nextStart.getUTCDate() + 7);

  const nextEnd = clone(currentEnd);
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 7);

  return { now, currentStart, currentEnd, nextStart, nextEnd, isLive };
}
