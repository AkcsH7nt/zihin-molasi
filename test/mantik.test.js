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

test('gozAdapt: üst üste 2 doğruda süre %20 kısalır', () => {
  assert.deepEqual(ZM.gozAdapt(300, true, 1), { ms: 240, run: 0 });
  assert.deepEqual(ZM.gozAdapt(300, true, 0), { ms: 300, run: 1 });
});

test('gozAdapt: yanlışta süre %25 uzar', () => {
  assert.deepEqual(ZM.gozAdapt(300, false, 1), { ms: 375, run: 0 });
});

test('gozAdapt: süre 50..600 ms arasında kalır', () => {
  assert.equal(ZM.gozAdapt(55, true, 2).ms, 50);
  assert.equal(ZM.gozAdapt(550, false, 0).ms, 600);
});

test('gozScore: yalnız doğrular puan alır, kısa süre daha çok', () => {
  assert.equal(ZM.gozScore([{ ok: true, ms: 100 }, { ok: false, ms: 50 }]), 50);
  assert.equal(ZM.gozScore([{ ok: true, ms: 600 }]), 1);
  assert.equal(ZM.gozScore([]), 0);
});

const HAVUZ = Array.from({ length: 30 }, (_, i) => 'k' + i);

test('pickWords: istenen sayıda tekrarsız kelime, dışlananlar hariç', () => {
  const ex = new Set(HAVUZ.slice(0, 20));
  const w = ZM.pickWords(HAVUZ, 6, Math.random, ex);
  assert.equal(w.length, 6);
  assert.equal(new Set(w).size, 6);
  assert.ok(w.every(x => !ex.has(x) && HAVUZ.includes(x)));
});

test('recallScore: isabet eksi yanlış, en az 0', () => {
  assert.equal(ZM.recallScore(['a', 'b', 'x'], ['a', 'b', 'c']), 1);
  assert.equal(ZM.recallScore([], ['a', 'b', 'c']), 0);
  assert.equal(ZM.recallScore(['x', 'y'], ['a']), 0);
});

test('recallScore: 6\'dan fazla seçim ilk 6 ile sınırlanır', () => {
  const t = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.equal(ZM.recallScore(['x', 'y', 'a', 'b', 'c', 'd', 'e', 'f'], t), 2);
});

test('pendingRecall: dünün kelimeleri sorulmadıysa dünün anahtarı', () => {
  assert.equal(ZM.pendingRecall({ '2026-11-12': { w: ['a'] } }, T), '2026-11-12');
});

test('pendingRecall: dün zaten sorulduysa ya da kayıt yoksa null', () => {
  assert.equal(ZM.pendingRecall({ '2026-11-12': { w: ['a'], next: 3 } }, T), null);
  assert.equal(ZM.pendingRecall({ '2026-11-10': { w: ['a'] } }, T), null);
  assert.equal(ZM.pendingRecall({}, T), null);
});

test('Hafıza Sarayı: seviye 1 → 4 yer, seviye 7 → 10 yer', () => {
  assert.equal(ZM.palaceSize(1), 4);
  assert.equal(ZM.palaceSize(7), 10);
  assert.equal(ZM.palaceSize(99), 10);
});

test('Hafıza Sarayı: en büyük seviyeye yetecek kadar yer var', () => {
  assert.ok(ZM.YERLER.length >= ZM.palaceSize(7));
  assert.equal(ZM.YERLER[0], 'Bina kapısı');
});

test('streak: dün boşsa ve bugün henüz oynanmadıysa seri bekler (affedilir)', () => {
  assert.deepEqual(ZM.streak(new Set([gun(2), gun(3)]), T), { n: 2, shielded: true });
});

test('streak: dün ve önceki gün boşsa seri biter', () => {
  assert.deepEqual(ZM.streak(new Set([gun(3), gun(4)]), T), { n: 0, shielded: false });
});

// ---- 2. tur: şirin tasarım + motivasyon ----
test('loadState: tanışma ve mola saati alanları varsayılanla gelir', () => {
  const s = ZM.loadState({ hist: [] });
  assert.equal(s.onb, false);
  assert.equal(s.slot, null);
});

test('weekProgress: pazartesiden bugüne oynanan gün sayısı, hedef 5', () => {
  // T = 13 Kasım 2026 Cuma; hafta 9 Kasım Pazartesi başlar
  const days = new Set([gun(0), gun(1), gun(4), gun(5), gun(6)]); // Cu, Pe, Pt + geçen hafta Paz, Cmt
  assert.deepEqual(ZM.weekProgress(days, T), { done: 3, goal: 5 });
});

test('weekProgress: hedef aşılınca 5 ile sınırlanmaz, gerçek sayı döner', () => {
  const days = new Set([0, 1, 2, 3, 4].map(gun));
  assert.equal(ZM.weekProgress(days, T).done, 5);
});

test('weekProgress: pazar günü hafta hâlâ pazartesiden sayılır', () => {
  const pazar = new Date(2026, 10, 15, 9, 0);
  const days = new Set(['2026-11-09', '2026-11-15', '2026-11-08']);
  assert.equal(ZM.weekProgress(days, pazar).done, 2);
});

test('inSlot: seçilen mola saatinin içinde mi', () => {
  assert.equal(ZM.inSlot('ikindi', 15), true);
  assert.equal(ZM.inSlot('ikindi', 17), true);
  assert.equal(ZM.inSlot('ikindi', 18), false);
  assert.equal(ZM.inSlot(null, 15), false);
  assert.equal(ZM.inSlot('sabah', 9), true);
});

const durum = o => Object.assign({ everPlayed: true, playedToday: false, doneToday: false, gap: 1, weekday: 3, weekDone: 1, hour: 10, slot: null }, o);

test('mascot: ilk kez gelen karşılanır', () => {
  assert.deepEqual(ZM.mascot(durum({ everPlayed: false, gap: null })), { mood: 'heyecanli', key: 'hosgeldin' });
});

test('mascot: bugünkü mola bittiyse gururlu', () => {
  assert.deepEqual(ZM.mascot(durum({ playedToday: true, doneToday: true, gap: 0 })), { mood: 'gururlu', key: 'tamam' });
});

test('mascot: uzun aradan sonra suçlamadan karşılar', () => {
  assert.deepEqual(ZM.mascot(durum({ gap: 5 })), { mood: 'mutlu', key: 'ozledim' });
});

test('mascot: dün atlandıysa seri bekliyor der', () => {
  assert.deepEqual(ZM.mascot(durum({ gap: 2 })), { mood: 'mutlu', key: 'bekliyor' });
});

test('mascot: haftalık hedefe 1 kala heyecanlanır', () => {
  assert.deepEqual(ZM.mascot(durum({ weekDone: 4 })), { mood: 'heyecanli', key: 'sonbir' });
});

test('mascot: pazartesi yeni başlangıç', () => {
  assert.deepEqual(ZM.mascot(durum({ weekday: 1, weekDone: 0 })), { mood: 'mutlu', key: 'yenihafta' });
});

test('mascot: seçilen mola saatinde çay vakti der', () => {
  assert.deepEqual(ZM.mascot(durum({ slot: 'sabah', hour: 10 })), { mood: 'heyecanli', key: 'cayvakti' });
});

test('mascot: gece uykulu, gündüz saate göre selam', () => {
  assert.deepEqual(ZM.mascot(durum({ hour: 23 })), { mood: 'uykulu', key: 'gece' });
  assert.deepEqual(ZM.mascot(durum({ hour: 10 })), { mood: 'mutlu', key: 'selam' });
});

test('mascot: bugün oynadı ama mola bitmedi → devam', () => {
  assert.deepEqual(ZM.mascot(durum({ playedToday: true, gap: 0 })), { mood: 'mutlu', key: 'devam' });
});

test('highlight: yeni rekor varsa günün yıldızı odur', () => {
  const r = [{ id: 'a', s: 10, best: 20 }, { id: 'b', s: 31, best: 30 }, { id: 'c', s: 5, best: null }];
  assert.deepEqual(ZM.highlight(r), { id: 'b', record: true });
});

test('highlight: rekor yoksa rekoruna en çok yaklaşılan oyun', () => {
  const r = [{ id: 'a', s: 10, best: 20 }, { id: 'b', s: 27, best: 30 }];
  assert.deepEqual(ZM.highlight(r), { id: 'b', record: false });
});

test('highlight: sonuç yoksa null', () => {
  assert.equal(ZM.highlight([]), null);
});

test('shareText: seri ve adres içerir, skor içermez', () => {
  const t = ZM.shareText(4, 'https://ornek.test/');
  assert.ok(t.includes('4 gün'));
  assert.ok(t.includes('https://ornek.test/'));
  assert.ok(ZM.shareText(0, 'u').includes('u'));
  assert.ok(!ZM.shareText(0, 'u').includes('0 gün'));
});
