// AMAVI wordmark set in the presentation's heading style (condensed caps, deep indigo).
// When the official logo file is provided, place it at /public/logo.svg and swap it in here —
// every page (header, footer, home, booking) uses this one component.
export function Wordmark({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span
      className={`font-display uppercase leading-none text-[1.7rem] tracking-[0.22em] font-medium ${tone === "light" ? "text-ink-2" : "text-cream"} ${className}`}
    >
      AMAVI
    </span>
  );
}
