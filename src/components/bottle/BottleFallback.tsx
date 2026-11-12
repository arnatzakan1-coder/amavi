export function BottleFallback({ liquidColor, fill = 0.72 }: { liquidColor: string; fill?: number }) {
  const top = 92 + (1 - fill) * 150;
  return (
    <svg viewBox="0 0 200 280" className="h-[78%] w-auto" aria-hidden>
      <defs>
        <linearGradient id="bf-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".04" />
          <stop offset="1" stopColor="#fff" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id="bf-gold" x1="0" x2="1">
          <stop offset="0" stopColor="#8a6a33" />
          <stop offset=".45" stopColor="#e6d3ae" />
          <stop offset="1" stopColor="#8a6a33" />
        </linearGradient>
      </defs>
      <rect x="70" y="14" width="60" height="54" rx="5" fill="url(#bf-gold)" />
      <rect x="86" y="66" width="28" height="12" fill="#a8874c" />
      <rect x="40" y="78" width="120" height="180" rx="10" fill="#ffffff" fillOpacity=".06" stroke="#e6d3ae" strokeOpacity=".5" />
      <rect x="50" y={top} width="100" height={248 - top} rx="4" fill={liquidColor} fillOpacity=".75" />
      <rect x="40" y="78" width="120" height="180" rx="10" fill="url(#bf-glass)" />
      <rect x="66" y="140" width="68" height="84" fill="#f3ebdd" fillOpacity=".95" />
      <text x="100" y="178" textAnchor="middle" fontFamily="Cormorant, serif" fontSize="17" letterSpacing="3" fill="#1a1612">AMAVI</text>
      <line x1="80" x2="120" y1="190" y2="190" stroke="#b8955a" strokeWidth=".8" />
    </svg>
  );
}
