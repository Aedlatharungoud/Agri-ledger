import React from "react";
import "./ui.css";

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <div className={`al-page-header ${className}`}>
      <div>
        {eyebrow && <span className="al-page-header__eyebrow">{eyebrow}</span>}
        <h1 className="al-page-header__title">{title}</h1>
        {description && (
          <p className="al-page-header__description">{description}</p>
        )}
      </div>
      {actions && <div className="al-page-header__actions">{actions}</div>}
    </div>
  );
};
