import { useEffect, useRef } from "react";

/** Cyan medical-scanner cursor with a short glowing trail and fading test-tube particles.
 * Disabled on touch devices and when the user prefers reduced motion. */
export function ScannerCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    document.documentElement.classList.add("ht-cursor");
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0, last = 0, hovering = false;
    const trail: HTMLDivElement[] = [];
    for (let i = 0; i < 8; i++) {
      const t = document.createElement("div");
      t.className = "pointer-events-none fixed left-0 top-0 rounded-full bg-primary";
      Object.assign(t.style, { width: "6px", height: "6px", opacity: String(0.5 - i * 0.06), filter: "blur(1px)", zIndex: "9998" });
      layer.current?.appendChild(t);
      trail.push(t);
    }
    const pts = trail.map(() => ({ x, y }));

    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      const el = (e.target as HTMLElement)?.closest?.("a,button,[role=button],input,textarea,select,label");
      hovering = !!el;
      const now = performance.now();
      if (now - last > 140 && layer.current) {
        last = now;
        const p = document.createElement("div");
        const women = document.documentElement.dataset["theme"] === "women";
        p.textContent = women ? (Math.random() < 0.3 ? "✨" : "💗") : "🧪";
        p.setAttribute("aria-hidden", "true");
        Object.assign(p.style, {
          position: "fixed", left: `${x + 10}px`, top: `${y + 6}px`, fontSize: "11px",
          pointerEvents: "none", zIndex: "9997", animation: "float-up .9s ease-out forwards",
          filter: "drop-shadow(0 0 4px var(--primary))",
        });
        layer.current.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }
    };
    const loop = () => {
      rx += (x - rx) * 0.22; ry += (y - ry) * 0.22;
      if (dot.current) dot.current.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
      if (ring.current) {
        const s = hovering ? 1.8 : 1;
        ring.current.style.transform = `translate(${rx - 16}px, ${ry - 16}px) scale(${s})`;
        ring.current.style.opacity = hovering ? "1" : "0.7";
      }
      pts[0] = { x, y };
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i]!, b = pts[i - 1]!;
        a.x += (b.x - a.x) * 0.45;
        a.y += (b.y - a.y) * 0.45;
      }
      trail.forEach((t, i) => (t.style.transform = `translate(${pts[i]!.x - 3}px, ${pts[i]!.y - 3}px)`));
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      trail.forEach((t) => t.remove());
      document.documentElement.classList.remove("ht-cursor");
    };
  }, []);

  return (
    <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[9999] hidden [@media(pointer:fine)]:block motion-reduce:hidden">
      <div ref={dot} className="fixed left-0 top-0 h-2 w-2 rounded-full bg-primary shadow-glow" />
      <div
        ref={ring}
        className="fixed left-0 top-0 h-8 w-8 rounded-full border border-primary transition-[opacity] duration-200"
        style={{ boxShadow: "0 0 18px var(--primary), inset 0 0 8px var(--primary)" }}
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/40" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary/40" />
      </div>
    </div>
  );
}
