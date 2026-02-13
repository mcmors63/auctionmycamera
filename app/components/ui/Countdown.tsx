"use client";

import { useEffect, useState } from "react";

type Props = {
  targetTime: string | Date | null;
  prefix?: string;
};

export default function Countdown({ targetTime, prefix }: Props) {
  const [now, setNow] = useState(Date.now());

  const target =
    targetTime instanceof Date
      ? targetTime.getTime()
      : targetTime
      ? new Date(targetTime).getTime()
      : null;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) return null;

  const diffMs = target - now;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);

  let label = "";
  if (days > 0) label = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0) label = `${hours}h ${mins}m`;
  else label = `${mins}m`;

  return (
    <span className="text-xs text-gray-500">
      {prefix && <span className="mr-1">{prefix}</span>}
      <span className="font-semibold text-yellow-700">{label}</span>
    </span>
  );
}
