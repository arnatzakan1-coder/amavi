export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`}>
      <span className="font-display text-[1.65rem] tracking-[0.32em] text-cream">AMAVI</span>
      <span className="mt-1 text-[0.52rem] tracking-[0.42em] uppercase text-gold">Perfume Atelier</span>
    </span>
  );
}
