"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="group fixed bottom-6 right-6 z-50 cursor-pointer border border-slate-200 bg-brand p-3 text-white transition-transform hover:-translate-y-1"
      title="Takaisin Ylös"
    >
      <span className="block text-xl font-semibold transition-transform group-hover:-translate-y-1">
        ↑
      </span>
    </button>
  );
}
