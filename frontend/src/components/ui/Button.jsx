import React from "react";

const VARIANTS = {
  primary: "bg-primary text-white shadow-btn hover:bg-[#303030] active:bg-black",
  secondary: "bg-surface text-ink shadow-[inset_0_0_0_1px_#E3E3E3,0_1px_0_rgba(0,0,0,.05)] hover:bg-surface2 active:bg-line2",
  // acción discreta sin borde (volver, acciones de fila); sigue siendo un botón, no un enlace
  tertiary: "bg-transparent text-ink hover:bg-black/[.05] active:bg-black/[.08]",
  critical: "bg-critBar text-white shadow-btn hover:bg-[#C41800]",
  // acción destructiva aislada: contorno hasta que se usa
  criticalOutline: "bg-surface text-crit shadow-[inset_0_0_0_1px_#F5B5AE] hover:bg-critBg",
};

const SIZES = {
  lg: "h-12 px-5 text-[15px] rounded-xl gap-2",
  md: "h-11 sm:h-8 px-3 text-[13.5px] sm:text-[13px] rounded-lg gap-1.5",
  sm: "h-10 sm:h-7 px-2.5 text-[13px] sm:text-[12.5px] rounded-lg gap-1",
};
const ICON_ONLY = { lg: "w-12 h-12 rounded-xl", md: "w-11 h-11 sm:w-8 sm:h-8 rounded-lg", sm: "w-10 h-10 sm:w-7 sm:h-7 rounded-lg" };

// Clases de botón reutilizables (p. ej. en un <label> que envuelve un input de archivo)
export function buttonClass({ variant = "secondary", size = "md", iconOnly = false, className = "" } = {}) {
  return `inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer transition-colors duration-150 disabled:bg-surface2 disabled:text-ink3 disabled:shadow-[inset_0_0_0_1px_#E3E3E3] disabled:pointer-events-none ${iconOnly ? ICON_ONLY[size] : SIZES[size]} ${VARIANTS[variant]} ${className}`;
}

export default function Button({ variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, iconOnly, children, className = "", busy, ...props }) {
  const iconSize = size === "lg" ? 18 : size === "sm" ? 14 : 15;
  return (
    <button type="button" {...props} disabled={props.disabled || busy}
      className={buttonClass({ variant, size, iconOnly, className })}>
      {Icon && <Icon size={iconSize} strokeWidth={2.2} aria-hidden="true" />}
      {busy ? "Procesando…" : children}
      {IconRight && !busy && <IconRight size={iconSize} strokeWidth={2.2} aria-hidden="true" />}
    </button>
  );
}
