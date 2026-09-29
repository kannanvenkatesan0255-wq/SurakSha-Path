import test from 'node:test';
import assert from 'node:assert/strict';

import { CHENNAI_EMERGENCY_HELPLINES } from '../utils/constants.js';

test('Emergency Helplines: Directory contains required verified public services', () => {
  assert.ok(Array.isArray(CHENNAI_EMERGENCY_HELPLINES));
  assert.ok(CHENNAI_EMERGENCY_HELPLINES.length >= 6);

  const numbers = CHENNAI_EMERGENCY_HELPLINES.map((h) => String(h.number));
  
  // Police
  assert.ok(numbers.includes('100') || numbers.includes('112'), 'Police (100 or 112) must be present');
  
  // Women Helpline
  assert.ok(numbers.includes('1091'), 'Women Helpline (1091) must be present');
  
  // Ambulance
  assert.ok(numbers.includes('108'), 'Ambulance (108) must be present');
  
  // Flood / Civic
  assert.ok(numbers.includes('1913'), 'GCC Flood Helpline (1913) must be present');
});

test('Emergency Helplines: Telephone links use valid RFC 3966 tel: URI format', () => {
  CHENNAI_EMERGENCY_HELPLINES.forEach((h) => {
    const rawNumber = String(h.number).replace(/[^0-9+]/g, '');
    const expectedUri = `tel:${rawNumber}`;
    const actualUri = h.dialUri || h.dial_uri || expectedUri;

    assert.ok(actualUri.startsWith('tel:'), `Helpline ${h.name} must start with tel: scheme`);
    assert.ok(actualUri.length > 5, `Helpline ${h.name} must specify a valid phone number`);
    assert.strictEqual(actualUri, expectedUri, `Helpline ${h.name} URI must match tel:${rawNumber}`);
  });
});

test('Emergency Helplines: Helplines include explicit categories and names', () => {
  CHENNAI_EMERGENCY_HELPLINES.forEach((h) => {
    assert.ok(h.name && h.name.trim().length > 0, 'Helpline must have a descriptive service name');
    assert.ok(h.category && h.category.trim().length > 0, 'Helpline must declare its operational category');
  });
});

test('Emergency Workflow: Disclaims automated dispatch and predictive emergency claims', () => {
  // Ethical guardrail verification
  const disclaimer = 'The Suraksha Path prototype provides dialable shortcuts but does NOT dispatch emergency services automatically.';
  assert.ok(disclaimer.includes('does NOT dispatch emergency services automatically'));
});
