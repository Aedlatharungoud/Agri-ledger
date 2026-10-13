import React from "react";
import "./ui.css";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  badge,
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`al-stat-card ${onClick ? "al-card--interactive" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="al-stat-card__top">
        <span className="al-stat-card__label">{label}</span>
        {icon && <div className="al-stat-card__icon-wrap">{icon}</div>}
      </div>

      <div className="al-stat-card__value">{value}</div>

      {(subtitle || badge) && (
        <div className="al-stat-card__bottom">
          {badge && <div className="al-stat-card__badge">{badge}</div>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
