import React from "react";
import "./ui.css";

export type AlertVariant = "error" | "warning" | "success" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  className = "",
  onClose,
}) => {
  const icons: Record<AlertVariant, string> = {
    error: "⚠️",
    warning: "⚡",
    success: "✓",
    info: "ℹ",
  };

  return (
    <div className={`al-alert al-alert--${variant} ${className}`} role="alert">
      <span className="al-alert__icon" aria-hidden="true">
        {icons[variant]}
      </span>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>{title}</div>
        )}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            color: "inherit",
            opacity: 0.7,
          }}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};
