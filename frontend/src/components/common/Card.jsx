import React from 'react';

export function Card({ title, subtitle, badge, action, children, className = '', ...props }) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {(title || badge || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div>
            {title && <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {badge}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
