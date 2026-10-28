import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {copy, facts, film} from '../src/data.ts';

test('both formats use 60 fps and a contiguous film between 30 and 45 seconds', () => {
  assert.equal(film.fps, 60);
  assert.ok(film.seconds >= 30 && film.seconds <= 45);
  let end = 0;
  for (const shot of film.shots) {
    assert.equal(shot.start, end);
    end += shot.seconds;
  }
  assert.equal(end, film.seconds);
  assert.deepEqual(film.portrait, {width: 1080, height: 1920});
  assert.deepEqual(film.landscape, {width: 1920, height: 1080});
});

test('portrait and landscape safe-area percentages match the delivery specification', async () => {
  const layout = await readFile(new URL('../src/layout.ts', import.meta.url), 'utf8');
  assert.match(layout, /portrait:\s*\{top:\s*0\.12,\s*bottom:\s*0\.18,\s*side:\s*0\.06\}/);
  assert.match(layout, /landscape:\s*\{top:\s*0\.05,\s*bottom:\s*0\.05,\s*side:\s*0\.05\}/);
});

test('scene rendering does not use opposing scene crossfades', async () => {
  const root = await readFile(new URL('../src/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(root, /outgoing|DirectionCut/);
});

test('the comparisons retain smaller products and the lite-package dependency', () => {
  const sizes = new Map(facts.install.map((row) => [row.id, row.value]));
  assert.equal(sizes.get('box'), 112);
  assert.equal(sizes.get('guzhou'), 118);
  assert.equal(sizes.get('root'), 41);
  assert.equal(sizes.get('lite'), 24);
  assert.match(facts.install.find((row) => row.id === 'lite')?.note ?? '', /128 MB/);
  assert.equal(facts.firstUse.find((row) => row.id === 'ours')?.value, 150);
  const disk = [...facts.extracted].sort((a, b) => b.value - a.value);
  assert.equal(disk.findIndex((row) => row.id === 'ours'), 3);
  assert.equal(disk[3].value, 404);
});

test('the module visualization represents the actual eight-domain total', () => {
  assert.equal(facts.domains.length, 8);
  assert.equal(facts.domains.reduce((sum, domain) => sum + domain.count, 0), facts.engineering.modules);
  assert.equal(facts.engineering.modules, 54);
});

test('honesty qualifications travel with the relevant claims', () => {
  assert.equal(facts.startup.seconds, 3.4);
  assert.match(facts.recording.label, /模拟器/);
  assert.match(copy.path.shared, /不止我们一家/);
  assert.match(copy.path.disclaimer, /未做竞品同条件/);
  assert.match(copy.shell.lowerBound, /下界估计/);
  assert.match(copy.shell.lowerBound, /不等于没有/);
  assert.equal(copy.shell.coverageOurs, '我们的实现覆盖');
  assert.match(copy.end.boundary, /API/);
});
