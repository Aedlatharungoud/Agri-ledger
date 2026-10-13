import React from "react";
import "./ui.css";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "forest";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      className={`al-badge al-badge--${variant} ${className}`}
      {...props}
    >
      {dot && <span className="al-badge__dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
