import React from "react";
import "./ui.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  subtle?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  subtle = false,
  className = "",
  children,
  ...props
}) => {
  const classes = [
    "al-card",
    interactive ? "al-card--interactive" : "",
    subtle ? "al-card--subtle" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`al-card__header ${className}`} {...props}>
      <div>
        {title && <h3 className="al-card__title">{title}</h3>}
        {subtitle && <p className="al-card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="al-card__header-action">{action}</div>}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`al-card__body ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`al-card__footer ${className}`} {...props}>
      {children}
    </div>
  );
};
