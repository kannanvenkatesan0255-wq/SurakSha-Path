import React from 'react';

export function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
