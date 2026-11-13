// Zihin Molası — saf oyun mantığı (tarayıcıda window.ZM, Node'da module.exports)
(function (g) {
  'use strict';

  const dayKey = (d = new Date()) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  const dayNum = (d = new Date()) =>
    Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

  // Seri: bugün oynanmadıysa dünden sayılır. 7 günlük pencerede 1 boş gün affedilir (sayıya eklenmez).
  function streak(days, today = new Date()) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const playedToday = days.has(dayKey(d));
    if (!playedToday) d.setDate(d.getDate() - 1);
    let n = 0, shielded = false, lastGap = null, i = 0;
    for (; ; i++) {
      if (days.has(dayKey(d))) { n++; }
      else {
        // seri henüz başlamadıysa yalnız "dün" boşluğu affedilebilir (bugün daha bitmedi)
        if (n === 0 && !(i === 0 && !playedToday)) break;
        if (lastGap !== null && i - lastGap < 7) break;
        // boşluğun ötesinde oynanmış gün yoksa affetmeye gerek yok
        const prev = new Date(d); prev.setDate(prev.getDate() - 1);
        if (!days.has(dayKey(prev))) break;
        lastGap = i; shielded = true;
      }
      d.setDate(d.getDate() - 1);
    }
    return { n, shielded };
  }

  const dailyGames = (dn, ids, k = 3) => Array.from({ length: k }, (_, i) => ids[(dn + i) % ids.length]);

  function loadState(raw) {
    const s = { hist: [], daily: {}, sound: false, hideInstall: false, lvl: {}, words: {}, onb: false, slot: null, bolum: {} };
    if (raw && typeof raw === 'object') {
      for (const k of Object.keys(s)) if (raw[k] !== undefined && raw[k] !== null) s[k] = raw[k];
    }
    return s;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // n-back: 8 sembol (0..7); n'den sonraki konumların ~%30'u hedef.
  function nbackSeq(n, len, rng = Math.random) {
    const s = [];
    for (let i = 0; i < len; i++) {
      if (i >= n && rng() < 0.3) { s.push(s[i - n]); continue; }
      let v, guard = 0;
      do { v = Math.floor(rng() * 8); guard++; }
      while (guard < 50 && ((i >= n && v === s[i - n]) || (i >= 1 && v === s[i - 1])));
      s.push(v);
    }
    return s;
  }
  const nbackTargets = (seq, n) => seq.map((v, i) => i >= n && v === seq[i - n]);

  // Günün Kelimeleri
  function pickWords(pool, n, rng = Math.random, exclude = new Set()) {
    const a = pool.filter(w => !exclude.has(w));
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  function recallScore(chosen, targets) {
    const t = new Set(targets);
    let s = 0;
    for (const c of chosen.slice(0, 6)) s += t.has(c) ? 1 : -1;
    return Math.max(0, s);
  }
  function pendingRecall(words, today = new Date()) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), k = dayKey(d);
    const r = words && words[k];
    return r && Array.isArray(r.w) && r.next === undefined ? k : null;
  }

  // Hafıza Sarayı: memurun her gün yürüdüğü güzergâh
  const YERLER = ['Bina kapısı', 'Danışma', 'Merdiven', 'Asansör', 'Koridor', 'Çay ocağı', 'Senin masan', 'Pencere', 'Dolap', 'Toplantı odası',
    'Yazıcı', 'Arşiv', 'Kantin', 'Müdür odası', 'Lavabo', 'Otopark'];

  // Haftalık hedef: pazartesiden bugüne oynanan gün sayısı (hedef 5 mola)
  function weekProgress(days, today = new Date()) {
    const off = (today.getDay() + 6) % 7; // pazartesi = 0
    let done = 0;
    for (let i = 0; i <= off; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      if (days.has(dayKey(d))) done++;
    }
    return { done, goal: 5 };
  }

  // "Şu olunca molamı veririm" planı için saat dilimleri
  const SLOTS = { sabah: [8, 11], ogle: [12, 14], ikindi: [15, 17], aksam: [18, 22] };
  const inSlot = (slot, hour) => !!SLOTS[slot] && hour >= SLOTS[slot][0] && hour <= SLOTS[slot][1];

  // Demli'nin ruh hali ve söyleyeceği şeyin türü. gap: son oyundan bu yana gün (0 = bugün, null = hiç)
  function mascot(st) {
    if (!st.everPlayed) return { mood: 'heyecanli', key: 'hosgeldin' };
    if (st.doneToday) return { mood: 'gururlu', key: 'tamam' };
    if (st.playedToday) return { mood: 'mutlu', key: 'devam' };
    if (st.gap >= 3) return { mood: 'mutlu', key: 'ozledim' };
    if (st.gap === 2) return { mood: 'mutlu', key: 'bekliyor' };
    if (st.weekDone === 4) return { mood: 'heyecanli', key: 'sonbir' };
    if (st.weekday === 1) return { mood: 'mutlu', key: 'yenihafta' };
    if (inSlot(st.slot, st.hour)) return { mood: 'heyecanli', key: 'cayvakti' };
    if (st.hour >= 22 || st.hour < 6) return { mood: 'uykulu', key: 'gece' };
    return { mood: 'mutlu', key: 'selam' };
  }

  const shareText = (n, url) =>
    'Zihin Molası’nda bugünkü molamı verdim ☕ ' + (n > 0 ? n + ' gün üst üste! ' : '') + 'Sen de dene: ' + url;

  // ---------- Bölümler: her oyunda 100 bölüm, numaradan üretilir ----------
  // Bölüm ilerledikçe "daha zor" değil "daha yoğun": daha çok kart, daha uzun sıra, daha çok basamak/soru.
  const LEVELS = 100;
  const START = { kolay: 1, orta: 21, zor: 41 };
  // Hızlı Hesap kademeleri (10 bölümde bir): d = terimlerin basamak sayıları, sec = soru başına saniye
  const HESAP = [
    { d: [1, 1], ops: '+-', sec: 4 }, { d: [2, 1], ops: '+-', sec: 5 }, { d: [2, 2], ops: '+-', sec: 6 }, { d: [1, 1, 1], ops: '+-', sec: 6 },
    { d: [1, 1], ops: 'x', sec: 5 }, { d: [2, 1, 1], ops: '+-', sec: 7 }, { d: [2, 1], ops: 'x', sec: 9 }, { d: [2, 2, 1], ops: '+-', sec: 9 },
    { d: [3, 2], ops: '+-', sec: 9 }, { d: [2, 2, 1, 1], ops: '+-', sec: 11 },
  ];
  function levelParams(id, n) {
    const k = clamp(Math.round(n) || 1, 1, LEVELS) - 1, t = Math.floor(k / 10), s = k % 10; // t: kademe 0..9, s: kademe içi adım 0..9
    switch (id) {
      case 'sira': return { len: [3, 4, 4, 5, 5, 6, 6, 7, 8, 9][t], grid: [3, 3, 3, 3, 4, 4, 4, 4, 5, 5][t], rounds: 2 + Math.floor(s / 4), onMs: 620 - t * 25 - s * 4, maxMistakes: 2 };
      case 'es': { const pairs = Math.min(18, 3 + Math.floor(k / 6)); return { pairs, maxMoves: Math.ceil(pairs * (3 - 0.12 * (k % 6))) }; }
      case 'hesap': { const h = HESAP[t], questions = 6 + s; return { d: h.d, ops: h.ops, sec: h.sec, questions, time: questions * h.sec, maxWrong: Math.floor(questions * 0.25) }; }
      case 'renk': { const items = 10 + s * 2; return { colors: [3, 3, 4, 4, 4, 5, 5, 5, 6, 6][t], items, switchP: t === 0 ? 0 : Math.min(0.4, 0.12 + t * 0.03), time: Math.round(items * Math.max(1.5, 2.4 - t * 0.1)), maxWrong: Math.floor(items * 0.2) }; }
      case 'iki': return { n: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4][t], scored: 10 + s * 2, showMs: Math.max(1100, 1800 - t * 70) };
      case 'goz': return { ms: Math.max(60, 400 - t * 36 - s * 2), trials: 6 + Math.floor(s / 2), positions: t < 4 ? 8 : 12, animals: t < 6 ? 4 : 6 };
      case 'saray': return { size: Math.min(16, 4 + t + Math.floor(s / 5)), studyMs: Math.max(3000, 6000 - t * 100 - s * 150) };
    }
    return null;
  }

  // Bölüm sonucu → 0 (geçemedi) .. 3 yıldız
  function rate(id, P, o) {
    const oran = (a, gec, iki, uc) => (a < gec ? 0 : a >= uc ? 3 : a >= iki ? 2 : 1);
    switch (id) {
      case 'sira': return !o.done || o.mistakes > P.maxMistakes ? 0 : 3 - o.mistakes;
      case 'es': return !o.done || o.moves > P.maxMoves ? 0 : o.moves <= Math.ceil(P.pairs * 1.7) ? 3 : o.moves <= Math.ceil(P.pairs * 2.2) ? 2 : 1;
      case 'hesap': case 'renk': {
        const N = id === 'hesap' ? P.questions : P.items;
        return !o.done || o.wrong > P.maxWrong ? 0 : o.wrong === 0 ? 3 : o.wrong <= Math.ceil(N * 0.12) ? 2 : 1;
      }
      case 'iki': return oran(o.acc, 0.7, 0.85, 0.95);
      case 'goz': return oran(o.acc, 0.6, 0.75, 0.9);
      case 'saray': return oran(o.acc, 0.7, 0.85, 1);
    }
    return 0;
  }

  // Bir oyunun bölüm kaydı: { cur: açık olan en ileri bölüm, st: { bölüm: en iyi yıldız } }
  function applyResult(b, n, stars) {
    const cur = (b && b.cur) || 1, st = Object.assign({}, b && b.st);
    if (stars > 0) st[n] = Math.max(st[n] || 0, stars);
    return { cur: stars > 0 && n >= cur ? Math.min(LEVELS, n + 1) : cur, st };
  }
  const skipAhead = (b, k = 10) => ({ cur: Math.min(LEVELS, ((b && b.cur) || 1) + k), st: Object.assign({}, b && b.st) });
  const totalStars = b => Object.values((b && b.st) || {}).reduce((t, x) => t + x, 0);

  function starOfDay(results) {
    const r = results.filter(x => x.stars > 0).sort((a, b) => b.stars - a.stars || b.n - a.n)[0];
    return r ? { id: r.id, stars: r.stars, n: r.n } : null;
  }

  // Hızlı Hesap sorusu: soldan sağa işlenir, ara sonuç hiç eksiye düşmez
  function hesapSoru(P, rng = Math.random) {
    const sayi = d => (d === 1 ? 2 + Math.floor(rng() * 8) : Math.pow(10, d - 1) + Math.floor(rng() * 9 * Math.pow(10, d - 1)));
    const a = P.d.map(sayi);
    if (P.ops === 'x') {
      if (P.d[0] === 2) a[0] = 11 + Math.floor(rng() * 29); // 11..39: zihinden yapılabilir kalsın
      return { text: a[0] + ' × ' + a[1], v: a[0] * a[1] };
    }
    let v = a[0], text = String(a[0]);
    for (let i = 1; i < a.length; i++) {
      const eksi = a[i] <= v && rng() < 0.5;
      v = eksi ? v - a[i] : v + a[i];
      text += (eksi ? ' − ' : ' + ') + a[i];
    }
    return { text, v };
  }

  const esCols = cards => (cards <= 6 ? 3 : cards <= 16 ? 4 : cards <= 30 ? 5 : 6);

  const ZM = { dayKey, dayNum, streak, dailyGames, loadState, clamp, nbackSeq, nbackTargets, pickWords, recallScore, pendingRecall, YERLER,
    weekProgress, SLOTS, inSlot, mascot, shareText,
    LEVELS, START, levelParams, rate, applyResult, skipAhead, totalStars, starOfDay, hesapSoru, esCols };
  g.ZM = Object.assign(g.ZM || {}, ZM);
  if (typeof module !== 'undefined' && module.exports) module.exports = g.ZM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
