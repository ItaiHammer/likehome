import { buttonClass, Popover } from "@/app/_components/ui";

type Props = {
  caption: string;
  index: number;
  count: number;
  onMakeCover: () => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
};

// The "•••" menu on each photo: make cover, reorder, remove. Built on Nolan's shared Popover.
export function PhotoMenu({ caption, index, count, onMakeCover, onMove, onRemove }: Props) {
  const items = [
    { label: "Make cover", show: index > 0, run: onMakeCover },
    { label: "Move earlier", show: index > 0, run: () => onMove(-1) },
    { label: "Move later", show: index < count - 1, run: () => onMove(1) },
    { label: "Remove photo", show: true, run: onRemove },
  ].filter((item) => item.show);

  return (
    <Popover
      label={`Options for ${caption}`}
      align="right"
      panelClassName="w-48 p-2"
      triggerClassName={buttonClass("secondary", "sm")}
      trigger={
        <>
          <span aria-hidden>•••</span>
          <span className="sr-only">Options for {caption}</span>
        </>
      }
    >
      {(close) => (
        <ul>
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  close();
                  item.run();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-ink hover:bg-blue/10 focus-visible:outline-2 focus-visible:outline-blue"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
