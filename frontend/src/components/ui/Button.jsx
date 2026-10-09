import React from "react";

const VARIANTS = {
  primary: "bg-primary text-white shadow-btn hover:bg-[#303030] active:bg-black",
  secondary: "bg-surface text-ink shadow-[inset_0_0_0_1px_#E3E3E3,0_1px_0_rgba(0,0,0,.05)] hover:bg-surface2",
  critical: "bg-critBar text-white shadow-btn hover:bg-[#C41800]",
  // acción destructiva aislada: contorno hasta que se usa
  criticalOutline: "bg-surface text-crit shadow-[inset_0_0_0_1px_#F5B5AE] hover:bg-critBg",
  plain: "text-link hover:underline underline-offset-2",
};

export default function Button({ variant = "secondary", size = "md", icon: Icon, children, className = "", busy, ...props }) {
  const sizes = size === "lg"
    ? "h-12 px-5 text-[15px] rounded-xl"
    : size === "sm" ? "h-8 px-2.5 text-[12.5px] rounded-lg" : "h-11 sm:h-8 px-3 text-[13.5px] sm:text-[13px] rounded-lg";
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors duration-150 disabled:bg-surface2 disabled:text-ink3 disabled:shadow-[inset_0_0_0_1px_#E3E3E3] disabled:pointer-events-none ${variant === "plain" ? "h-auto px-0" : sizes} ${VARIANTS[variant]} ${className}`}
    >
      {Icon && <Icon size={size === "lg" ? 18 : 15} strokeWidth={2.2} />}
      {busy ? "Procesando…" : children}
    </button>
  );
}
