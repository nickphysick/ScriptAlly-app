import React from "react";
import "./forms.css";

export type BrandInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** A plain text field in the locked form style. Forwards all native input props. */
export const BrandInput: React.FC<BrandInputProps> = ({ className, ...rest }) => (
  <input type="text" className={`sa-input${className ? ` ${className}` : ""}`} {...rest} />
);
