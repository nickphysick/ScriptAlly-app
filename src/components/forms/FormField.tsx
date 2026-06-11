import React from "react";
import "./forms.css";

export interface FormFieldProps {
  /** Mono uppercase field label. */
  label: string;
  /** The control — BrandDropdown / BrandDatePicker / BrandInput / etc. */
  children: React.ReactNode;
  /** Optional extra class on the label (e.g. one of the treatment classes below). */
  labelClassName?: string;
}

/** A labelled field: the locked mono label above its control. */
export const FormField: React.FC<FormFieldProps> = ({ label, children, labelClassName }) => (
  <div className="sa-field-wrap">
    <label className={`sa-label${labelClassName ? ` ${labelClassName}` : ""}`}>{label}</label>
    {children}
  </div>
);

/**
 * Per-field text treatments (spec item 4) — use as inline wrappers OR apply the classes
 * `sa-strong` / `sa-em` directly to any label/value text.
 *   <Strong>92,000 words</Strong>   ·   <Em>final draft</Em>
 */
export const Strong: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sa-strong">{children}</span>
);

export const Em: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sa-em">{children}</span>
);
