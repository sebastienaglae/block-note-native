/** Web overlay: portals above everything (escapes ScrollView stacking contexts). */
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface OverlayProps {
  onClose: () => void;
  top: number;
  left: number;
  children: ReactNode;
}

export function Overlay({ onClose, top, left, children }: OverlayProps): JSX.Element {
  return createPortal(
    <>
      <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 99998 }} />
      <div style={{ position: "fixed", top, left, zIndex: 99999 }}>{children}</div>
    </>,
    document.body,
  );
}
