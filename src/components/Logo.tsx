export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Health<span className="text-gradient-ice">Trace</span>
      </span>
    </span>
  );
}
