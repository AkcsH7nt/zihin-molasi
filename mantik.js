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
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0, shielded = false, lastGap = null, i = 0;
    for (; ; i++) {
      if (days.has(dayKey(d))) { n++; }
      else {
        if (n === 0) break;
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
    const s = { hist: [], daily: {}, sound: false, hideInstall: false, lvl: {}, words: {} };
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

  const ZM = { dayKey, dayNum, streak, dailyGames, loadState, clamp, startLevel, nbackSeq, nbackTargets, nbackAdapt };
  g.ZM = Object.assign(g.ZM || {}, ZM);
  if (typeof module !== 'undefined' && module.exports) module.exports = g.ZM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
