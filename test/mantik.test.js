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

test('shareText: seri ve adres içerir, skor içermez', () => {
  const t = ZM.shareText(4, 'https://ornek.test/');
  assert.ok(t.includes('4 gün'));
  assert.ok(t.includes('https://ornek.test/'));
  assert.ok(ZM.shareText(0, 'u').includes('u'));
  assert.ok(!ZM.shareText(0, 'u').includes('0 gün'));
});

// ---- 3. tur: bölümler (her oyunda 100 bölüm) ----
const OYUNLAR = ['sira', 'renk', 'es', 'hesap', 'iki', 'goz', 'saray'];

test('levelParams: her oyunda 1..100 arası her bölüm için sayısal değerler üretir', () => {
  for (const id of OYUNLAR) for (let n = 1; n <= 100; n++) {
    const P = ZM.levelParams(id, n);
    assert.ok(P, id + ' ' + n);
    for (const [k, v] of Object.entries(P)) if (typeof v === 'number') assert.ok(Number.isFinite(v) && v >= 0, `${id} ${n} ${k}=${v}`);
  }
});

test('levelParams: sınır dışı bölüm numarası 1..100 aralığına çekilir', () => {
  assert.deepEqual(ZM.levelParams('es', 0), ZM.levelParams('es', 1));
  assert.deepEqual(ZM.levelParams('es', 250), ZM.levelParams('es', 100));
});

test('Eşini Bul: kart sayısı bölümle artar (3 çiftten 18 çifte), hiç azalmaz', () => {
  assert.equal(ZM.levelParams('es', 1).pairs, 3);
  assert.equal(ZM.levelParams('es', 100).pairs, 18);
  for (let n = 2; n <= 100; n++) assert.ok(ZM.levelParams('es', n).pairs >= ZM.levelParams('es', n - 1).pairs);
});

test('Eşini Bul: hamle hakkı her zaman 2 yıldız eşiğinden geniştir', () => {
  for (let n = 1; n <= 100; n++) { const P = ZM.levelParams('es', n); assert.ok(P.maxMoves >= Math.ceil(P.pairs * 2.2), 'bölüm ' + n); }
});

test('Sıra Hafızası: sıra uzar, tur artar, tahta büyür; sıra tahtaya sığar', () => {
  assert.deepEqual(ZM.levelParams('sira', 1), { len: 3, grid: 3, rounds: 2, onMs: 620, maxMistakes: 2 });
  const son = ZM.levelParams('sira', 100);
  assert.equal(son.len, 9); assert.equal(son.grid, 5); assert.equal(son.rounds, 4);
  for (let n = 1; n <= 100; n++) { const P = ZM.levelParams('sira', n); assert.ok(P.len < P.grid * P.grid && P.onMs >= 300); }
});

test('Hızlı Hesap: basamak ve işlem sayısı kademeyle artar, soru sayısı 6..15', () => {
  assert.deepEqual(ZM.levelParams('hesap', 1).d, [1, 1]);
  assert.deepEqual(ZM.levelParams('hesap', 25).d, [2, 2]);
  assert.equal(ZM.levelParams('hesap', 95).d.length, 4);
  assert.equal(ZM.levelParams('hesap', 1).questions, 6);
  assert.equal(ZM.levelParams('hesap', 10).questions, 15);
  const P = ZM.levelParams('hesap', 10);
  assert.equal(P.time, P.questions * P.sec);
});

test('hesapSoru: sonuç negatif olmaz, terim ve basamak sayısı bölüme uyar', () => {
  for (let n = 1; n <= 100; n += 3) {
    const P = ZM.levelParams('hesap', n);
    for (let k = 0; k < 60; k++) {
      const q = ZM.hesapSoru(P);
      assert.ok(Number.isInteger(q.v) && q.v >= 0, `bölüm ${n}: ${q.text} = ${q.v}`);
      const sayilar = q.text.split(/ [+−×] /);
      assert.equal(sayilar.length, P.d.length, q.text);
      sayilar.forEach((x, i) => assert.equal(x.length, P.d[i], `bölüm ${n}: ${q.text}`));
    }
  }
});

test('Renk Tuzağı: renk sayısı 3ten 6ya, kelime sayısı 10dan 28e çıkar; ilk 10 bölümde kural değişmez', () => {
  assert.equal(ZM.levelParams('renk', 1).colors, 3);
  assert.equal(ZM.levelParams('renk', 100).colors, 6);
  assert.equal(ZM.levelParams('renk', 1).items, 10);
  assert.equal(ZM.levelParams('renk', 10).items, 28);
  assert.equal(ZM.levelParams('renk', 5).switchP, 0);
  assert.ok(ZM.levelParams('renk', 50).switchP > 0);
});

test('İki Önce / Göz Ucu / Saray: yoğunluk artar', () => {
  assert.equal(ZM.levelParams('iki', 1).n, 1);
  assert.equal(ZM.levelParams('iki', 100).n, 4);
  assert.equal(ZM.levelParams('iki', 100).scored, 28);
  assert.equal(ZM.levelParams('goz', 1).ms, 400);
  assert.ok(ZM.levelParams('goz', 100).ms >= 60);
  assert.equal(ZM.levelParams('goz', 100).positions, 12);
  assert.equal(ZM.levelParams('saray', 1).size, 4);
  assert.ok(ZM.levelParams('saray', 100).size <= ZM.YERLER.length);
  assert.ok(ZM.levelParams('saray', 100).size >= 13);
});

test('rate: Sıra Hafızası hatasız 3 yıldız, 2 hata 1 yıldız, bitmediyse 0', () => {
  const P = ZM.levelParams('sira', 1);
  assert.equal(ZM.rate('sira', P, { done: true, mistakes: 0 }), 3);
  assert.equal(ZM.rate('sira', P, { done: true, mistakes: 2 }), 1);
  assert.equal(ZM.rate('sira', P, { done: false, mistakes: 3 }), 0);
});

test('rate: Eşini Bul az hamle çok yıldız, hak aşılırsa 0', () => {
  const P = ZM.levelParams('es', 1); // 3 çift, 9 hamle hakkı
  assert.equal(P.maxMoves, 9);
  assert.equal(ZM.rate('es', P, { done: true, moves: 6 }), 3);
  assert.equal(ZM.rate('es', P, { done: true, moves: 7 }), 2);
  assert.equal(ZM.rate('es', P, { done: true, moves: 9 }), 1);
  assert.equal(ZM.rate('es', P, { done: false, moves: 10 }), 0);
});

test('rate: Hızlı Hesap ve Renk Tuzağı yanlış sayısına göre; süre biterse 0', () => {
  const P = ZM.levelParams('hesap', 10); // 15 soru, en fazla 3 yanlış
  assert.equal(P.maxWrong, 3);
  assert.equal(ZM.rate('hesap', P, { done: true, wrong: 0 }), 3);
  assert.equal(ZM.rate('hesap', P, { done: true, wrong: 2 }), 2);
  assert.equal(ZM.rate('hesap', P, { done: true, wrong: 3 }), 1);
  assert.equal(ZM.rate('hesap', P, { done: true, wrong: 4 }), 0);
  assert.equal(ZM.rate('hesap', P, { done: false, wrong: 0 }), 0);
  const R = ZM.levelParams('renk', 1); // 10 kelime, en fazla 2 yanlış
  assert.equal(ZM.rate('renk', R, { done: true, wrong: 1 }), 2);
  assert.equal(ZM.rate('renk', R, { done: true, wrong: 3 }), 0);
});

test('rate: doğruluk oranlı oyunlar (İki Önce, Göz Ucu, Saray)', () => {
  assert.equal(ZM.rate('iki', {}, { acc: 0.96 }), 3);
  assert.equal(ZM.rate('iki', {}, { acc: 0.86 }), 2);
  assert.equal(ZM.rate('iki', {}, { acc: 0.7 }), 1);
  assert.equal(ZM.rate('iki', {}, { acc: 0.69 }), 0);
  assert.equal(ZM.rate('goz', {}, { acc: 4 / 6 }), 1);
  assert.equal(ZM.rate('goz', {}, { acc: 3 / 6 }), 0);
  assert.equal(ZM.rate('saray', {}, { acc: 1 }), 3);
  assert.equal(ZM.rate('saray', {}, { acc: 0.9 }), 2);
});

test('applyResult: geçilen bölüm bir sonrakini açar, yıldız en iyisiyle kalır', () => {
  let b = ZM.applyResult(undefined, 1, 2);
  assert.deepEqual(b, { cur: 2, st: { 1: 2 } });
  b = ZM.applyResult(b, 1, 1);           // tekrar oynadı, daha az yıldız: değişmez
  assert.deepEqual(b, { cur: 2, st: { 1: 2 } });
  b = ZM.applyResult(b, 1, 3);
  assert.equal(b.st[1], 3);
  b = ZM.applyResult(b, 2, 0);           // geçemedi: açılmaz
  assert.deepEqual(b, { cur: 2, st: { 1: 3 } });
});

test('applyResult: 100. bölümden öteye geçilmez', () => {
  assert.equal(ZM.applyResult({ cur: 100, st: {} }, 100, 3).cur, 100);
});

test('skipAhead ve totalStars', () => {
  assert.equal(ZM.skipAhead({ cur: 5, st: { 1: 3 } }).cur, 15);
  assert.equal(ZM.skipAhead({ cur: 95, st: {} }).cur, 100);
  assert.equal(ZM.totalStars({ cur: 4, st: { 1: 3, 2: 2, 3: 1 } }), 6);
  assert.equal(ZM.totalStars(undefined), 0);
});

test('starOfDay: en çok yıldızlı, eşitse en ileri bölüm; hiç yıldız yoksa null', () => {
  assert.deepEqual(ZM.starOfDay([{ id: 'a', stars: 2, n: 9 }, { id: 'b', stars: 3, n: 2 }, { id: 'c', stars: 3, n: 5 }]), { id: 'c', stars: 3, n: 5 });
  assert.equal(ZM.starOfDay([{ id: 'a', stars: 0, n: 1 }]), null);
  assert.equal(ZM.starOfDay([]), null);
});

test('esCols: kart sayısına göre sütun', () => {
  assert.equal(ZM.esCols(6), 3);
  assert.equal(ZM.esCols(16), 4);
  assert.equal(ZM.esCols(20), 5);
  assert.equal(ZM.esCols(36), 6);
});

test('loadState: bölüm kaydı varsayılanı boş nesne', () => {
  assert.deepEqual(ZM.loadState({ hist: [] }).bolum, {});
});
