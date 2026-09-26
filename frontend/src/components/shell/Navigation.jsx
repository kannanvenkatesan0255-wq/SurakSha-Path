import React from 'react';
import { NAV_ITEMS } from '../../utils/constants';

export function Navigation({ activeTab, onTabChange }) {
  return (
    <nav style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      padding: '0 2rem',
      display: 'flex',
      gap: '0.5rem',
      overflowX: 'auto',
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--accent-teal)' : '2px solid transparent',
              color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
