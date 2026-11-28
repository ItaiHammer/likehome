import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noTime = () => 0;

/** The time to the minute, read on each render. 0 for the server render and hydration, so no server time is baked into the HTML. */
export const useCurrentMinute = () => useSyncExternalStore(noSubscribe, currentMinute, noTime);
