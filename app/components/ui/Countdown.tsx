// app/components/ui/Countdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  targetTime: string | Date | null;
  prefix?: string;
};

export default function Countdown({ targetTime, prefix }: Props) {
  const [now, setNow] = useState(() => Date.now());

  const target = useMemo(() => {
    if (!targetTime) return null;

    const t =
      targetTime instanceof Date ? targetTime.getTime() : new Date(targetTime).getTime();

    if (!t || Number.isNaN(t)) return null;
    return t;
  }, [targetTime]);

  const diffSec = target ? Math.max(0, Math.floor((target - now) / 1000)) : 0;

  useEffect(() => {
    if (!target) return;

    // If already reached, don't start a timer
    if (target <= Date.now()) return;

    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);

      // Stop ticking once we hit the target
      if (current >= target) {
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);

  let label = "";
  if (days > 0) label = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0) label = `${hours}h ${mins}m`;
  else label = `${mins}m`;

  return (
    <span className="text-xs text-neutral-600" aria-live="polite">
      {prefix && <span className="mr-1">{prefix}</span>}
      <span className="font-semibold text-neutral-900">{label}</span>
    </span>
  );
}