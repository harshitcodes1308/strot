"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        className: "!bg-[var(--surface-raised)] !text-[var(--ink)] !border !border-[var(--border)] !text-sm !font-sans",
        style: {
          background: "var(--surface-raised)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
        },
        success: {
          iconTheme: {
            primary: "var(--success)",
            secondary: "var(--surface)",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--error)",
            secondary: "var(--surface)",
          },
        },
      }}
    />
  );
}
