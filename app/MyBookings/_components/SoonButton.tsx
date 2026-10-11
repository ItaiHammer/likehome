import { Button, Tag, type ButtonVariant } from "@/app/_components/ui";

export function SoonButton({ variant = "secondary", className = "", children }: { variant?: ButtonVariant; className?: string; children: React.ReactNode }) {
  return (
    <Button variant={variant} disabled title="Coming soon" className={className}>
      {children}
      <Tag>Soon</Tag>
    </Button>
  );
}
