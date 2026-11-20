import type { ReactNode } from 'react';

/** Backdrop click closes; content click does not. Sticky footer optional. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
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
        {title ? (
          <header className="drawer-header">
            <h3>{title}</h3>
          </header>
        ) : null}
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
