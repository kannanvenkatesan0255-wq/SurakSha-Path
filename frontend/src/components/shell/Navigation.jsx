import React from 'react';
import { PrimaryNavigation } from './PrimaryNavigation';

/**
 * Backward-compatible Navigation component delegating to PrimaryNavigation.
 */
export function Navigation(props) {
  return <PrimaryNavigation {...props} />;
}
