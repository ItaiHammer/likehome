import type { Metadata } from "next";
import { Button, Card, Field, IconButton, Select, Stars, Tag, TextArea } from "../_components/ui";
import { InteractiveDemos } from "./InteractiveDemos";

export const metadata: Metadata = {
  title: "Components — LikeHome",
  description: "The shared LikeHome building blocks and their states.",
  robots: { index: false },
};

// Literal class names so Tailwind generates every swatch
const COLORS = [
  { name: "paper", swatch: "bg-paper", use: "Page background", light: "#FAF7F2", dark: "#0B1022" },
  { name: "surface", swatch: "bg-surface", use: "Cards and inputs", light: "#FFFFFF", dark: "#141B33" },
  { name: "ink", swatch: "bg-ink", use: "Headings and labels", light: "#070D2F", dark: "#EEF1F8" },
  { name: "slate", swatch: "bg-slate", use: "Body, helper and input text", light: "#536383", dark: "#9AA6BF" },
  { name: "edge", swatch: "bg-edge", use: "Borders and dividers", light: "#BAC8DF", dark: "#2C3857" },
  { name: "blue", swatch: "bg-blue", use: "Main action and links", light: "#4473B5", dark: "#6E95D6" },
  { name: "blue-dark", swatch: "bg-blue-dark", use: "Hover shade of blue, stronger blue text", light: "#3D66A6", dark: "#87A7DE" },
  { name: "on-blue", swatch: "bg-on-blue", use: "Text and icons on a blue fill", light: "#FFFFFF", dark: "#0B1022" },
  { name: "danger", swatch: "bg-danger", use: "Errors", light: "#C7444D", dark: "#E2777D" },
  { name: "disabled", swatch: "bg-disabled", use: "Disabled fill", light: "#E6EBF3", dark: "#1D2542" },
];

const TYPE = [
  { name: "Display", spec: "DM Serif Display · 44/52 phone, 56/64, 72/80 desktop", className: "font-serif text-[56px] leading-[64px]", sample: "Feel at home." },
  { name: "Heading", spec: "DM Serif Display · 40/48", className: "font-serif text-[40px] leading-[48px]", sample: "Popular destinations" },
  { name: "Title", spec: "Inter Bold · 24/32", className: "text-2xl font-bold leading-8", sample: "Who's checking in?" },
  { name: "Intro", spec: "Inter Regular · 20/28", className: "text-xl leading-7", sample: "A new favorite stay starts with a hello." },
  { name: "Body", spec: "Inter Regular · 16/24", className: "text-base leading-6 text-slate", sample: "Members save on thousands of handpicked homes." },
  { name: "Label", spec: "Inter SemiBold · 16/20", className: "text-base font-semibold leading-5", sample: "Email address" },
  { name: "Caption", spec: "Inter Regular · 14/20", className: "text-sm leading-5 text-slate", sample: "You won't be charged yet." },
];

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-control bg-disabled px-1.5 py-0.5 font-mono text-[13px] text-ink">{children}</code>;
}

function Group({ title, usage, children }: { title: string; usage?: string; children: React.ReactNode }) {
  return (
    <Card as="section" padding="lg">
      <h2 className="text-2xl font-bold leading-8 text-ink">{title}</h2>
      {usage && (
        <p className="mt-1 text-sm text-slate">
          <Code>{usage}</Code>
        </p>
      )}
      <div className="mt-6">{children}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-edge py-4 first:border-t-0 first:pt-0 sm:grid-cols-[140px_1fr] sm:items-center">
      <p className="text-sm font-semibold text-slate">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const ArrowIcon = ({ flip = false }: { flip?: boolean }) => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={flip ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
  </svg>
);

export default function ComponentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">LikeHome / Components</h1>
        <p className="mt-2 max-w-2xl text-xl leading-7 text-slate">
          The shared building blocks, from the Figma component sheet. Use these on every page so the site stays consistent
          (and dark mode keeps working).
        </p>
        <p className="mt-4 text-sm text-slate">
          <Code>{`import { Button, Card, Field } from "@/app/_components/ui";`}</Code>
        </p>
      </header>

      <Group title="Colors" usage='className="bg-paper text-slate border-edge"'>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((c) => (
            <li key={c.name} className="flex items-center gap-4">
              <span className={`h-12 w-12 shrink-0 rounded-control border border-edge ${c.swatch}`} aria-hidden />
              <span>
                <span className="block text-base font-semibold text-ink">{c.name}</span>
                <span className="block text-sm text-slate">{c.use}</span>
                <span className="block font-mono text-xs text-slate">
                  light {c.light} · dark {c.dark}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate">
          Use the names, never the hex codes: each one switches automatically in dark mode. They work with any Tailwind
          color utility: <Code>bg-blue</Code>, <Code>text-ink</Code>, <Code>border-edge</Code>, <Code>bg-blue/10</Code>…
        </p>
        <p className="mt-2 text-sm text-slate">
          Blue and danger are a shade darker than their original values (blue was the Figma&apos;s <Code>#4C79BD</Code>,
          danger <Code>#C9474F</Code>) so blue links, error text and white text on blue buttons all clear 4.5:1 contrast.
        </p>
      </Group>

      <Group title="Typography" usage='className="font-serif" for headlines only; Inter everywhere else'>
        <div className="divide-y divide-edge">
          {TYPE.map((t) => (
            <div key={t.name} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[140px_1fr] sm:items-baseline">
              <div>
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-slate">{t.spec}</p>
              </div>
              <p className={`text-ink ${t.className}`}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Buttons" usage='<Button variant="secondary" size="sm">Label</Button>  ·  variant: primary | secondary | ghost · size: md | sm · optional href, loading'>
        <Row label="Primary">
          <Button>Create account</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </Row>
        <Row label="Secondary">
          <Button variant="secondary">Sign in</Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="Ghost">
          <Button variant="ghost">Browse stays</Button>
          <Button variant="ghost" size="sm">
            Small
          </Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="Link as button">
          <Button href="/">Back to home</Button>
          <Button href="/" variant="secondary">
            Also a link
          </Button>
        </Row>
        <Row label="Icon button">
          <IconButton label="Previous">
            <ArrowIcon flip />
          </IconButton>
          <IconButton label="Next">
            <ArrowIcon />
          </IconButton>
          <IconButton label="Next" size="sm">
            <ArrowIcon />
          </IconButton>
          <IconButton label="Next" disabled>
            <ArrowIcon />
          </IconButton>
        </Row>
      </Group>

      <Group title="Fields" usage='<Field id="email" label="Email address" error={…} />  ·  <Select id="sort" label="Sort by" options={[…]} />  ·  <TextArea id="notes" label="Notes" />'>
        <div className="grid gap-6 md:grid-cols-2">
          <Field id="demo-default" label="First name" placeholder="Alex" hint="As it appears on your ID." />
          <Field id="demo-error" label="Email address" defaultValue="alex@" error="Enter a valid email address." />
          <Field id="demo-disabled" label="Room" defaultValue="Garden room" disabled />
          <Select
            id="demo-select"
            label="Sort by"
            defaultValue="recommended"
            options={[
              { value: "recommended", label: "Recommended" },
              { value: "price", label: "Price: low to high" },
              { value: "rating", label: "Guest rating" },
            ]}
          />
          <TextArea id="demo-textarea" label="Special requests (optional)" placeholder="Arriving late, need a crib…" className="md:col-span-2" />
        </div>
      </Group>

      <Group title="Tags and ratings" usage='<Tag tone="blue">Sea view</Tag>  ·  tone: neutral | blue · size: sm | md  ·  <Stars rating={4.96} reviews={128} />'>
        <Row label="Neutral">
          <Tag>Sea view</Tag>
          <Tag>Pool</Tag>
          <Tag size="md">Free breakfast</Tag>
        </Row>
        <Row label="Blue">
          <Tag tone="blue">New</Tag>
          <Tag tone="blue" size="md">
            Member price
          </Tag>
        </Row>
        <Row label="Stars">
          <Stars rating={4.96} />
          <Stars rating={4.92} reviews={86} />
        </Row>
      </Group>

      <Group title="Cards" usage='<Card tone="tint" href="/auth/login">…</Card>  ·  tone: surface | tint · padding: none | md | lg · optional href, as'>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-lg font-semibold text-ink">Surface</p>
            <p className="mt-1 text-base text-slate">The default: white (navy in dark mode) with an edge border.</p>
          </Card>
          <Card tone="tint">
            <p className="text-lg font-semibold text-ink">Tint</p>
            <p className="mt-1 text-base text-slate">Soft blue, to set a group apart, like the feature cards.</p>
          </Card>
          <Card href="/components">
            <p className="text-lg font-semibold text-ink">Link card</p>
            <p className="mt-1 text-base text-slate">Pass href and the whole card becomes a link.</p>
          </Card>
        </div>
      </Group>

      <InteractiveDemos />
    </main>
  );
}
