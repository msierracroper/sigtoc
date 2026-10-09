import React from "react";
import { C } from "../../styles/tokens";

export default function Perforation() {
  return (
    <div className="hidden sm:flex flex-col justify-between py-2" style={{ width: 16 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: C.paperDark }} />
      ))}
    </div>
  );
}
