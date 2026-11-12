// Small server-friendly building blocks for admin forms.
export function H1({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl">{children}</h1>
      {sub && <p className="mt-2 text-sm text-muted max-w-3xl">{sub}</p>}
    </div>
  );
}

export function Saved({ show, text = "Сохранено" }: { show: boolean; text?: string }) {
  if (!show) return null;
  return <p role="status" className="mb-5 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">{text}</p>;
}

export function Needs({ children }: { children: React.ReactNode }) {
  return <span className="chip border-gold/60 text-champagne">⚑ {children}</span>;
}

export function Input({ label, name, defaultValue, type = "text", hint, required, step, className = "" }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; hint?: string; required?: boolean; step?: string; className?: string;
}) {
  const id = `a-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} name={name} type={type} step={step} required={required} defaultValue={defaultValue ?? ""} className="field" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, name, defaultValue, rows = 3, hint, className = "" }: {
  label: string; name: string; defaultValue?: string | null; rows?: number; hint?: string; className?: string;
}) {
  const id = `a-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} className="field" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-sm cursor-pointer min-h-[40px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#e6d3ae]" />
      {label}
    </label>
  );
}

export function Submit({ children = "Сохранить" }: { children?: React.ReactNode }) {
  return <button className="btn btn-gold btn-sm">{children}</button>;
}
