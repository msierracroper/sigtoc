import React from "react";

// Fila con interruptor (checkbox accesible con apariencia de switch)
export default function SwitchRow({ label, description, checked, onChange, disabled, tone = "ink" }) {
  const on = tone === "ok" ? "peer-checked:bg-okBar" : tone === "info" ? "peer-checked:bg-link" : "peer-checked:bg-ink";
  return (
    <label className={`min-h-12 sm:min-h-10 px-3 py-2 rounded-xl flex items-center gap-3 shadow-[inset_0_0_0_1px_#E3E3E3] ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span className="flex-1">
        <span className="block text-[14px] sm:text-[13.5px]">{label}</span>
        {description && <span className="block text-[12.5px] text-ink2 mt-0.5">{description}</span>}
      </span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="peer sr-only" />
      <span className={`flex-none w-10 h-6 rounded-full bg-[#C9C9C9] relative transition-colors ${on} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-focus after:absolute after:top-[3px] after:left-[3px] after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4`} />
    </label>
  );
}
