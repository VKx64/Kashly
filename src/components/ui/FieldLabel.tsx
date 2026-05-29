import React from "react";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{children}</p>;
}
