import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconDot3V } from "../icons";

/**
 * A "⋮" action menu whose popover is rendered in a portal on `document.body`
 * with fixed positioning. This deliberately escapes the surrounding `.card`
 * (which uses `overflow: hidden` for its rounded corners) so the menu is never
 * clipped — the reason the inline `.menu` got cut off in Schedule/Dashboard.
 *
 * `children` is a render prop receiving a `close()` callback; menu items should
 * call it after firing their action. Reuses the existing `.menu`/`.menu-item`
 * styling from styles.css.
 */
export function KebabMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const close = () => setOpen(false);
  const toggle = () => {
    if (!open) place();
    setOpen((o) => !o);
  };

  // Flip the menu above the button if it would overflow the viewport bottom.
  useLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const r = btnRef.current?.getBoundingClientRect();
    if (!menu || !r) return;
    const h = menu.offsetHeight;
    if (r.bottom + 4 + h > window.innerHeight) {
      setCoords((c) => ({ ...c, top: Math.max(8, r.top - 4 - h) }));
    }
  }, [open]);

  // Close on scroll/resize — the captured fixed coords would otherwise drift.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="btn btn-ghost btn-sm"
        style={{ width: 32, padding: 0, height: 32 }}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconDot3V size={18} />
      </button>
      {open &&
        createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={close} />
            <div
              ref={menuRef}
              className="menu"
              style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 60 }}
            >
              {children(close)}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
