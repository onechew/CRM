import type { ReactNode } from 'react';

/** Backdrop click closes; content click does not. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        {title ? <h3>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
