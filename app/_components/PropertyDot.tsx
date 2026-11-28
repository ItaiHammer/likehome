import { PROPERTY_COLORS } from "@/lib/owner-calendar";

// One per lib/owner-calendar's PROPERTY_COLORS; each a shade lighter in dark mode so it shows on navy
const COLORS: string[] = [
  "bg-blue",
  "bg-[#2f8f75] dark:bg-[#5fbf9f]",
  "bg-[#b0662a] dark:bg-[#e0a066]",
  "bg-[#7656c0] dark:bg-[#a98ee6]",
  "bg-[#ad4577] dark:bg-[#e07fab]",
].slice(0, PROPERTY_COLORS);

const SIZES = { sm: "h-[7px] w-[7px]", md: "h-[9px] w-[9px]", lg: "h-2.5 w-2.5" };

/** The small dot in a property's calendar colour (from calendarProperties) */
export function PropertyDot({ color, size = "lg", className = "" }: { color: number; size?: keyof typeof SIZES; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full forced-colors:bg-[CanvasText] ${SIZES[size]} ${COLORS[color % COLORS.length]} ${className}`} />;
}
