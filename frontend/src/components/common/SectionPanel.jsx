import React from 'react';

/**
 * SectionPanel component.
 * Reusable container for Route details, Evidence, Community information, and Contextual explanations.
 */
export function SectionPanel({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  style = {},
  ariaLabel,
}) {
  return (
    <section
      className={`section-panel ${className}`}
      style={style}
      aria-label={ariaLabel || title}
    >
      {(title || subtitle || badge || action) && (
        <div className="section-panel-header">
          <div>
            {title && <h3 className="section-panel-title">{title}</h3>}
            {subtitle && <p className="section-panel-subtitle">{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {badge}
            {action}
          </div>
        </div>
      )}
      <div className="section-panel-body">
        {children}
      </div>
    </section>
  );
}
