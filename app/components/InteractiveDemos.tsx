"use client";

import { useState } from "react";
import { Button, Card, Popover, Stepper, Tabs } from "../_components/ui";

// The components that need state, shown working on /components
export function InteractiveDemos() {
  const [tab, setTab] = useState<"near" | "national" | "international">("near");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  // The popover demo keeps its own counts, so one change isn't announced twice
  const [popAdults, setPopAdults] = useState(2);
  const [popChildren, setPopChildren] = useState(0);
  const guests = popAdults + popChildren;

  return (
    <>
      <Card as="section" padding="lg">
        <h2 className="text-2xl font-bold leading-8 text-ink">Tabs</h2>
        <p className="mt-1 text-sm text-slate">
          <code className="rounded-control bg-disabled px-1.5 py-0.5 font-mono text-[13px] text-ink">{`<Tabs label items value onChange>panel</Tabs>`}</code>
          <span className="ml-2">Arrow keys, Home and End move between tabs.</span>
        </p>
        <Tabs
          className="mt-6"
          label="Destinations"
          value={tab}
          onChange={setTab}
          items={[
            { id: "near", label: "Near you" },
            { id: "national", label: "National" },
            { id: "international", label: "International" },
          ]}
        >
          <p className="text-base text-slate">
            Showing the <span className="font-semibold text-ink">{tab}</span> panel.
          </p>
        </Tabs>
      </Card>

      <Card as="section" padding="lg">
        <h2 className="text-2xl font-bold leading-8 text-ink">Stepper and popover</h2>
        <p className="mt-1 text-sm text-slate">
          <code className="rounded-control bg-disabled px-1.5 py-0.5 font-mono text-[13px] text-ink">{`<Stepper label value min max onChange />`}</code>
          <span className="mx-2">·</span>
          <code className="rounded-control bg-disabled px-1.5 py-0.5 font-mono text-[13px] text-ink">{`<Popover label trigger>{(close) => …}</Popover>`}</code>
        </p>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="max-w-sm divide-y divide-edge rounded-control border border-edge px-4">
            <Stepper label="Adults" hint="Ages 13 or above" value={adults} min={1} max={16} onChange={setAdults} />
            <Stepper label="Children" hint="Ages 0 to 12" value={children} min={0} max={10} onChange={setChildren} />
          </div>
          <div>
            <Popover label="Choose guests" trigger={`${guests} ${guests === 1 ? "guest" : "guests"}`}>
              {(close) => (
                <>
                  <div className="cascade divide-y divide-edge" style={{ "--i": 0 } as React.CSSProperties}>
                    <Stepper label="Adults" hint="Ages 13 or above" size="sm" value={popAdults} min={1} max={16} onChange={setPopAdults} />
                    <Stepper label="Children" hint="Ages 0 to 12" size="sm" value={popChildren} min={0} max={10} onChange={setPopChildren} />
                  </div>
                  <div className="cascade mt-2" style={{ "--i": 1 } as React.CSSProperties}>
                    <Button className="w-full" onClick={close}>
                      Done
                    </Button>
                  </div>
                </>
              )}
            </Popover>
            <p className="mt-3 text-sm text-slate">Opens under its button, closes on Done, an outside click or Escape.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
