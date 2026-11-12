export function SampleNotice({ label = "Demo data", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-lg border border-edge bg-surface/75 px-4 py-3 text-sm text-slate">
      <span className="mt-0.5 inline-flex shrink-0 rounded-control bg-blue/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-blue-dark">
        {label}
      </span>
      <p>{children}</p>
    </div>
  );
}
