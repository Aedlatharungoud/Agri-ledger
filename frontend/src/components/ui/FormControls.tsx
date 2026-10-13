import React from "react";
import "./ui.css";

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  help,
  className = "",
  children,
}) => {
  return (
    <div className={`al-form-field ${className}`}>
      {label && (
        <label className={`al-label ${required ? "al-label--required" : ""}`}>
          {label}
        </label>
      )}
      {children}
      {error && <span className="al-field-error">{error}</span>}
      {help && !error && <span className="al-field-help">{help}</span>}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`al-input ${hasError ? "al-input--error" : ""} ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`al-select ${hasError ? "al-select--error" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`al-textarea ${hasError ? "al-textarea--error" : ""} ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
