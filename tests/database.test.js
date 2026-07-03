import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const tempDir = mkdtempSync(join(tmpdir(), 'xoso-db-test-'));
process.env.DATABASE_PATH = join(tempDir, 'test.db');

const { getDb } = await import('../src/lib/db/database.js');
const { saveDraw, findDraw, updateDraw } = await import('../src/lib/db/queries/results.js');

const prizes = {
  giai_db: '12345', giai_nhat: '23456',
  giai_nhi: ['12345', '54321'],
  giai_ba: ['11111', '22222', '33333', '44444', '55555', '66666'],
  giai_tu: ['1111', '2222', '3333', '4444'],
  giai_nam: ['1111', '2222', '3333', '4444', '5555', '6666'],
  giai_sau: ['111', '222', '333'], giai_bay: ['11', '22', '33', '44'],
};

after(() => {
  getDb().close();
  rmSync(tempDir, { recursive: true, force: true });
});

test('database enforces one draw per province and date', () => {
  const id = saveDraw('2026-07-01', prizes);
  assert.equal(findDraw('2026-07-01').id, id);
  assert.throws(() => saveDraw('2026-07-01', prizes), (error) => error.code === 'SQLITE_CONSTRAINT_UNIQUE');
});

test('update refuses a missing draw instead of reporting success', () => {
  assert.throws(() => updateDraw(999_999, '2026-07-02', prizes), /DRAW_NOT_FOUND/);
});
