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
          <stop offset="0" stopColor="#4e3a80" />
          <stop offset=".45" stopColor="#c7a9e5" />
          <stop offset="1" stopColor="#4e3a80" />
        </linearGradient>
      </defs>
      <rect x="70" y="14" width="60" height="54" rx="5" fill="url(#bf-gold)" />
      <rect x="86" y="66" width="28" height="12" fill="#4e3a80" />
      <rect x="40" y="78" width="120" height="180" rx="10" fill="#ffffff" fillOpacity=".35" stroke="#2c0a71" strokeOpacity=".35" />
      <rect x="50" y={top} width="100" height={248 - top} rx="4" fill={liquidColor} fillOpacity=".75" />
      <rect x="40" y="78" width="120" height="180" rx="10" fill="url(#bf-glass)" />
      <rect x="66" y="140" width="68" height="84" fill="#fffde6" fillOpacity=".95" />
      <text x="100" y="178" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="17" letterSpacing="3" fill="#2c0a71">AMAVI</text>
      <line x1="80" x2="120" y1="190" y2="190" stroke="#9b77be" strokeWidth=".8" />
    </svg>
  );
}
