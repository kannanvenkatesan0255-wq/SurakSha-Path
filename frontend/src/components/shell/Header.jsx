import React from 'react';
import { AppHeader } from './AppHeader';

/**
 * Backward-compatible Header component delegating to AppHeader.
 */
export function Header(props) {
  return <AppHeader {...props} />;
}
