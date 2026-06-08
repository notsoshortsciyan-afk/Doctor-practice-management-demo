import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates after `delay` ms of no changes.
// Used to keep fast-typing search boxes from firing a server request per keystroke:
// the input stays instant (local state), but the debounced value — which drives the
// query — settles once the user pauses.
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
