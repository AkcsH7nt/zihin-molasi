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

test('nbackSeq: istenen uzunlukta, 0..7 arası semboller', () => {
  const s = ZM.nbackSeq(2, 17);
  assert.equal(s.length, 17);
  assert.ok(s.every(v => Number.isInteger(v) && v >= 0 && v <= 7));
});

test('nbackSeq: hedef oranı yaklaşık %30', () => {
  let t = 0, c = 0;
  for (let k = 0; k < 200; k++) {
    const s = ZM.nbackSeq(2, 17), tg = ZM.nbackTargets(s, 2);
    t += tg.filter(Boolean).length; c += s.length - 2;
  }
  const oran = t / c;
  assert.ok(oran > 0.2 && oran < 0.4, 'oran ' + oran);
});

test('nbackTargets: n önceki ile aynıysa hedef', () => {
  assert.deepEqual(ZM.nbackTargets([1, 2, 1, 3], 2), [false, false, true, false]);
  assert.deepEqual(ZM.nbackTargets([5, 5, 4], 1), [false, true, false]);
});

test('nbackAdapt: başarıya göre n artar/azalır, 1..4 sınırında', () => {
  assert.equal(ZM.nbackAdapt(1, 0.9), 2);
  assert.equal(ZM.nbackAdapt(4, 0.95), 4);
  assert.equal(ZM.nbackAdapt(1, 0.3), 1);
  assert.equal(ZM.nbackAdapt(3, 0.4), 2);
  assert.equal(ZM.nbackAdapt(2, 0.6), 2);
});
