const TONE: Record<string, string> = {
  PENDING_PAYMENT: "border-gold/50 text-champagne",
  AWAITING_CONFIRMATION: "border-gold/50 text-champagne",
  PAID: "border-ok/50 text-ok",
  PERFUMER_REVIEW: "border-ok/50 text-ok",
  IN_PRODUCTION: "border-ok/50 text-ok",
  READY: "border-ok text-ok",
  SHIPPED: "border-ok text-ok",
  DELIVERED: "border-line text-cream/70",
  CANCELLED: "border-danger/50 text-danger",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`chip justify-self-start ${TONE[status] ?? ""}`}>{label}</span>;
}
