"use client";

import { useState } from "react";
import { useApp } from "./AppProvider";

export default function PlanButton({
  planName,
  highlight,
}: {
  planName: string;
  highlight: boolean;
}) {
  const { user, openAuth } = useApp();
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() =>
          user
            ? setNote(`${planName}: төлбөрийн систем удахгүй холбогдоно.`)
            : openAuth("login")
        }
        className={`h-11 rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.03] ${
          highlight ? "btn-accent" : "border border-line bg-white/5"
        }`}
      >
        Авах
      </button>
      {note && <p className="mt-2 max-w-[200px] text-right text-xs text-price">{note}</p>}
    </div>
  );
}
