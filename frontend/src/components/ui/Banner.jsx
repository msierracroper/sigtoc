import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const TONES = {
  critical: { box: "bg-[#FFF4F4] shadow-[inset_0_0_0_1px_#FECDCA]", icon: AlertCircle, iconCls: "text-critBar", text: "text-[#5C1B12]" },
  warning: { box: "bg-[#FFF8EB] shadow-[inset_0_0_0_1px_#FFD79D]", icon: AlertTriangle, iconCls: "text-warnBar", text: "text-warn" },
  info: { box: "bg-[#F2F8FF] shadow-[inset_0_0_0_1px_#C3DDFB]", icon: Info, iconCls: "text-link", text: "text-info" },
};

export default function Banner({ tone = "info", children, action }) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div className={`flex gap-2.5 items-start rounded-xl px-3.5 py-3 ${t.box}`} role={tone === "critical" ? "alert" : "status"}>
      <Icon size={18} className={`flex-none mt-px ${t.iconCls}`} />
      <div className={`text-[14px] sm:text-[13.5px] ${t.text}`}>
        {children}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
