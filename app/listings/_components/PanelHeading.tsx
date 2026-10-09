// Title (and optional subtitle) at the top of an editor tab, with an optional button on the right.
export function PanelHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-[32px] leading-10 font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-lg text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
