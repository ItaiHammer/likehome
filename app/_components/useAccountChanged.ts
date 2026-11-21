import { useEffect, useState } from "react";
import { onAccountChange } from "./accountChange";

/** True once the signed-in account changes after this page loaded (signed out, or another account), here or in another tab. */
export function useAccountChanged(): boolean {
  const [changed, setChanged] = useState(false);
  useEffect(() => onAccountChange(() => setChanged(true)), []);
  return changed;
}
