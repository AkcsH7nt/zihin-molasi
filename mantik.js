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
    const s = { hist: [], daily: {}, sound: false, hideInstall: false, lvl: {}, words: {}, onb: false, slot: null };
    if (raw && typeof raw === 'object') {
      for (const k of Object.keys(s)) if (raw[k] !== undefined && raw[k] !== null) s[k] = raw[k];
    }
    return s;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const startLevel = (saved, min, max) => (saved == null ? min : clamp(saved - 1, min, max));

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
  const nbackAdapt = (n, acc) => clamp(acc >= 0.8 ? n + 1 : acc < 0.5 ? n - 1 : n, 1, 4);

  // Göz Ucu: 2 doğru üst üste → süre ×0.8; yanlış → ×1.25; 50..600 ms.
  function gozAdapt(ms, ok, run) {
    if (!ok) return { ms: clamp(Math.round(ms * 1.25), 50, 600), run: 0 };
    run += 1;
    if (run >= 2) return { ms: clamp(Math.round(ms * 0.8), 50, 600), run: 0 };
    return { ms, run };
  }
  const gozScore = trials => trials.reduce((t, x) => t + (x.ok ? Math.max(1, Math.round((600 - x.ms) / 10)) : 0), 0);

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
  const YERLER = ['Bina kapısı', 'Danışma', 'Merdiven', 'Asansör', 'Koridor', 'Çay ocağı', 'Senin masan', 'Pencere', 'Dolap', 'Toplantı odası'];
  const palaceSize = level => 3 + clamp(level, 1, 7);

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

  // Günün yıldızı: yeni rekor varsa o, yoksa rekoruna en çok yaklaşılan oyun
  function highlight(results) {
    if (!results.length) return null;
    const oran = r => (r.best ? r.s / r.best : 0);
    const rec = results.filter(r => r.best != null && r.s > r.best).sort((a, b) => oran(b) - oran(a))[0];
    if (rec) return { id: rec.id, record: true };
    const top = results.slice().sort((a, b) => oran(b) - oran(a) || b.s - a.s)[0];
    return { id: top.id, record: false };
  }

  const shareText = (n, url) =>
    'Zihin Molası’nda bugünkü molamı verdim ☕ ' + (n > 0 ? n + ' gün üst üste! ' : '') + 'Sen de dene: ' + url;

  const ZM = { dayKey, dayNum, streak, dailyGames, loadState, clamp, startLevel, nbackSeq, nbackTargets, nbackAdapt, gozAdapt, gozScore, pickWords, recallScore, pendingRecall, YERLER, palaceSize,
    weekProgress, SLOTS, inSlot, mascot, highlight, shareText };
  g.ZM = Object.assign(g.ZM || {}, ZM);
  if (typeof module !== 'undefined' && module.exports) module.exports = g.ZM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
