const test = require('node:test');
const assert = require('node:assert/strict');
const ZM = require('../mantik.js');

const T = new Date(2026, 10, 13, 10, 0); // 13 Kasım 2026, yerel
const gun = n => { const d = new Date(T); d.setDate(d.getDate() - n); return ZM.dayKey(d); };

test('dayKey yerel tarihi YYYY-MM-DD verir', () => {
  assert.equal(ZM.dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(ZM.dayKey(new Date(2026, 0, 6, 0, 1)), '2026-01-06');
});

test('streak: ardışık üç gün = 3, koruma kullanılmadı', () => {
  assert.deepEqual(ZM.streak(new Set([gun(0), gun(1), gun(2)]), T), { n: 3, shielded: false });
});

test('streak: bugün oynanmadıysa dünden sayar', () => {
  assert.deepEqual(ZM.streak(new Set([gun(1), gun(2)]), T), { n: 2, shielded: false });
});

test('streak: tek boş gün seriyi bozmaz', () => {
  assert.deepEqual(ZM.streak(new Set([gun(0), gun(2), gun(3)]), T), { n: 3, shielded: true });
});

test('streak: 7 gün içinde ikinci boşluk seriyi keser', () => {
  assert.deepEqual(ZM.streak(new Set([gun(0), gun(2), gun(4)]), T), { n: 2, shielded: true });
});

test('streak: 7 günden uzak ikinci boşluk da affedilir', () => {
  const days = new Set([0, 2, 3, 4, 5, 6, 7, 8, 10, 11].map(gun)); // boşluklar: 1. ve 9. gün
  assert.deepEqual(ZM.streak(days, T), { n: 10, shielded: true });
});

test('streak: hiç oyun yoksa 0', () => {
  assert.deepEqual(ZM.streak(new Set(), T), { n: 0, shielded: false });
});

test('dailyGames her gün dönen 3 oyun verir', () => {
  assert.deepEqual(ZM.dailyGames(5, ['a', 'b', 'c', 'd', 'e', 'f']), ['f', 'a', 'b']);
  assert.deepEqual(ZM.dailyGames(0, ['a', 'b', 'c', 'd']), ['a', 'b', 'c']);
});

test('loadState eski kayda varsayılan alanları ekler', () => {
  assert.deepEqual(ZM.loadState(null).lvl, {});
  assert.deepEqual(ZM.loadState(null).words, {});
  const s = ZM.loadState({ hist: [{ g: 'sira', s: 4, d: '2026-11-13' }], sound: true });
  assert.equal(s.hist.length, 1);
  assert.equal(s.sound, true);
  assert.deepEqual(s.daily, {});
});

test('startLevel: kayıt yoksa en alttan, varsa bir tık aşağıdan başlar', () => {
  assert.equal(ZM.startLevel(undefined, 3, 9), 3);
  assert.equal(ZM.startLevel(7, 3, 9), 6);
  assert.equal(ZM.startLevel(3, 3, 9), 3);
  assert.equal(ZM.startLevel(20, 1, 4), 4);
});
