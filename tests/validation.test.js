import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDate, validatePrizes, boundedInt } from '../src/lib/server/validation.js';
import { getLast2 } from '../src/lib/logic/parser.js';
import { buildFrequencyMap } from '../src/lib/logic/frequency.js';

const completePrizes = {
  giai_db: '12345', giai_nhat: '23456',
  giai_nhi: ['12345', '54321'],
  giai_ba: ['11111', '22222', '33333', '44444', '55555', '66666'],
  giai_tu: ['1111', '2222', '3333', '4444'],
  giai_nam: ['1111', '2222', '3333', '4444', '5555', '6666'],
  giai_sau: ['111', '222', '333'],
  giai_bay: ['11', '22', '33', '44'],
};

test('date validation rejects impossible dates', () => {
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2024-02-29'), true);
});

test('prize validation normalizes complete valid payload', () => {
  const result = validatePrizes(completePrizes);
  assert.equal(result.error, null);
  assert.deepEqual(result.prizes.giai_nhi, ['12345', '54321']);
});

test('prize validation rejects unknown, malformed and incomplete data', () => {
  assert.match(validatePrizes({ ...completePrizes, admin: '1' }).error, /không hợp lệ/);
  assert.match(validatePrizes({ ...completePrizes, giai_bay: ['1', '22', '33', '44'] }).error, /2 chữ số/);
  assert.match(validatePrizes({ ...completePrizes, giai_nhi: ['12345'] }).error, /đủ 2/);
});

test('partial prize payload is accepted only in partial mode', () => {
  const result = validatePrizes({ giai_db: '12345' }, { requireComplete: false });
  assert.equal(result.error, null);
  assert.equal(result.prizes.giai_db, '12345');
  assert.deepEqual(result.prizes.giai_bay, []);
});

test('integer bounds, parser and frequency helpers handle edge cases', () => {
  assert.equal(boundedInt('999', 20, { min: 1, max: 100 }), 100);
  assert.equal(boundedInt('nope', 20, { min: 1, max: 100 }), 20);
  assert.equal(getLast2('00007'), '07');
  assert.equal(getLast2('x7'), null);
  assert.equal(buildFrequencyMap(['07', '07', '99'])['07'], 2);
});
