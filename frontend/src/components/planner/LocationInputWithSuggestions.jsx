import React, { useState, useRef, useEffect } from 'react';
import { searchChennaiLocations } from '../../services/locationService';

/**
 * LocationInputWithSuggestions component.
 * Provides accessible place-name input with Chennai demonstration suggestions.
 * Shows clear provenance labeling on every suggestion.
 */
export function LocationInputWithSuggestions({
  label,
  id,
  value,
  onChange,
  onSelectSuggestion,
  placeholder,
  icon = '📍',
  error,
  helperText,
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const inputId = id || `loc-input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  // Update suggestions on input value change
  useEffect(() => {
    if (value && value.trim().length >= 2) {
      const results = searchChennaiLocations(value);
      setSuggestions(results);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (item) => {
    onChange(item.name);
    if (onSelectSuggestion) onSelectSuggestion(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span style={{ color: 'var(--color-risk-high)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 'var(--space-3)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
            fontSize: '1rem',
          }}
        >
          {icon}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="form-input"
          style={{
            paddingLeft: '2.4rem',
            paddingRight: value ? '2rem' : '0.85rem',
            borderColor: error ? 'var(--color-risk-high)' : undefined,
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${inputId}-suggestions`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Clear ${label || 'location'}`}
            style={{
              position: 'absolute',
              right: 'var(--space-2)',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '0.85rem',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {error ? (
        <div id={`${inputId}-error`} style={{ fontSize: '0.78rem', color: 'var(--color-risk-high-text)', marginTop: '4px' }}>
          {error}
        </div>
      ) : helperText ? (
        <div id={`${inputId}-helper`} className="form-helper">
          {helperText}
        </div>
      ) : null}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${inputId}-suggestions`}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border-active)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            maxHeight: '260px',
            overflowY: 'auto',
            listStyle: 'none',
            padding: '4px',
            margin: 0,
          }}
        >
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isHighlighted}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-xs)',
                  background: isHighlighted ? 'var(--color-surface-elevated)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    {item.corridor}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.66rem',
                    color: 'var(--color-brand-cyan)',
                    background: 'var(--color-surface-card)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Chennai Catalog
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
