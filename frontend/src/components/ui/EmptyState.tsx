import React from "react";
import "./ui.css";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "🌾",
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`al-empty-state ${className}`}>
      <div className="al-empty-state__icon">{icon}</div>
      <h3 className="al-empty-state__title">{title}</h3>
      {description && (
        <p className="al-empty-state__description">{description}</p>
      )}
      {action && <div className="al-empty-state__action">{action}</div>}
    </div>
  );
};
