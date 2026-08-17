"use client";

/**
 * Light and dark, remembered.
 *
 * Set as a data attribute on <html> so every colour follows from the variables
 * in globals.css rather than from a second set of components. Read before paint
 * in layout.tsx, so switching does not flash the wrong theme on load.
 */

import { useEffect, useState } from "react";
import { BLUR } from "./ui";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  const set = (next: boolean) => {
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    try {
      localStorage.setItem("hl_theme", next ? "light" : "dark");
    } catch {
      // A blocked localStorage should not stop the theme changing for this visit.
    }
  };

  return (
    <button
      onClick={() => set(!light)}
      style={BLUR(24)}
      aria-label={light ? "Switch to dark" : "Switch to light"}
      className="min-h-[48px] px-5 rounded-full bezel text-[16px]"
    >
      {light ? "Dark" : "Light"}
    </button>
  );
}
