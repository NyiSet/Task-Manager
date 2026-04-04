"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

type DatePickerProps = {
  value: string | null;
  onChange: (date: string | null) => void;
};

export function DatePicker({ value, onChange }: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formattedDate = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pick a date";

  const openPicker = () => {
    if (!inputRef.current) return;

    if ("showPicker" in HTMLInputElement.prototype) {
      inputRef.current.showPicker();
    } else {
      inputRef.current.focus();
      inputRef.current.click();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={`flex h-12 w-full items-center rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
          value ? "text-slate-900" : "text-slate-400"
        }`}
      >
        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
        <span>{formattedDate}</span>
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}