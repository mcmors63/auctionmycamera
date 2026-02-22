// app/components/ui/Toast.tsx
"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
};

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClosing(true);
      window.setTimeout(onClose, 250); // match transition duration
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [onClose]);

  const bg =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600";

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-lg shadow-lg",
        bg,
        "transition-opacity transition-transform duration-250",
        closing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
      ].join(" ")}
    >
      {message}
    </div>
  );
}