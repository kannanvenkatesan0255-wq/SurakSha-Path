import React from 'react';

/**
 * Accessible Button component adhering to Suraksha Path visual identity.
 */
export function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'subtle'
  size = 'md',         // 'sm', 'md'
  icon,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ariaLabel,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const variantClass = `btn-${variant}`;

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'btn-spin 0.6s linear infinite',
            }}
            aria-hidden="true"
          />
          <style>{`
            @keyframes btn-spin { to { transform: rotate(360deg); } }
          `}</style>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
