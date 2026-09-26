import React from 'react';

/**
 * TextInput component with label, helper text, and error presentation.
 */
export function TextInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  icon,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`form-group ${className}`} style={{ width: '100%' }}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span style={{ color: 'var(--color-risk-high)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
              fontSize: '0.9rem',
            }}
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="form-input"
          style={{
            paddingLeft: icon ? '2.2rem' : '0.85rem',
            borderColor: error ? 'var(--color-risk-high)' : undefined,
          }}
          aria-invalid={!!error}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--color-risk-high-text)', marginTop: '4px' }}>
          {error}
        </div>
      ) : helperText ? (
        <div id={`${inputId}-helper`} className="form-helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}

/**
 * SelectInput component.
 */
export function SelectInput({
  label,
  id,
  value,
  onChange,
  options = [],
  helperText,
  required = false,
  className = '',
  ...props
}) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`form-group ${className}`} style={{ width: '100%' }}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span style={{ color: 'var(--color-risk-high)' }}>*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className="form-select"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helperText && <div className="form-helper">{helperText}</div>}
    </div>
  );
}
