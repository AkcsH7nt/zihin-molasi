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
    const s = { hist: [], daily: {}, sound: false, hideInstall: false, lvl: {}, words: {}, onb: false, slot: null, bolum: {}, ozel: {} };
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
      case 'sudoku': return k < 20 ? { size: 4, blanks: 4 + Math.floor(k / 3), maxMistakes: 3 }
        : k < 50 ? { size: 6, blanks: 10 + Math.floor((k - 20) / 2), maxMistakes: 3 }
          : { size: 9, blanks: 30 + Math.floor((k - 50) / 2.5), maxMistakes: 3 };
      case 'kelime': {
        const n = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10][t], words = Math.min(10, 3 + Math.floor(s / 2) + Math.floor(t / 3));
        return { n, words, dirs: t < 3 ? 2 : t < 6 ? 3 : t < 8 ? 4 : 8, time: words * 25 + n * 5 };
      }
      case 'yapboz': {
        const [cols, rows] = [[2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6], [6, 7], [7, 7]][t], N = cols * rows;
        return { cols, rows, maxMoves: Math.ceil(N * (2.6 - 0.06 * s)) };
      }
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
      case 'sudoku': return !o.done || o.mistakes > P.maxMistakes ? 0 : o.mistakes === 0 ? 3 : o.mistakes === 1 ? 2 : 1;
      case 'kelime': return !o.done ? 0 : o.left >= 0.5 ? 3 : o.left >= 0.25 ? 2 : 1;
      case 'yapboz': { const N = P.cols * P.rows; return !o.done || o.moves > P.maxMoves ? 0 : o.moves <= Math.ceil(N * 1.2) ? 3 : o.moves <= Math.ceil(N * 1.7) ? 2 : 1; }
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

  // ---------- Bulmacalar ----------
  // Tohumlu rastgele sayı (aynı tohum → aynı dizi): yapboz resimleri bölüme göre sabit kalsın diye
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const karistir = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Sudoku: kutu [genişlik, yükseklik]
  const KUTU = { 4: [2, 2], 6: [3, 2], 9: [3, 3] };
  // Çözüm sayısını `limit`e kadar sayar (0 = çelişkili). En az adayı olan kutudan dallanır.
  function sudokuSay(grid, size, limit = 2) {
    const [bw, bh] = KUTU[size], g = grid.slice(), full = (1 << size) - 1, kps = size / bw;
    const R = new Array(size).fill(0), C = new Array(size).fill(0), B = new Array(size).fill(0);
    const kutu = i => Math.floor(Math.floor(i / size) / bh) * kps + Math.floor((i % size) / bw);
    for (let i = 0; i < g.length; i++) {
      if (!g[i]) continue;
      const bit = 1 << (g[i] - 1), r = Math.floor(i / size), c = i % size, b = kutu(i);
      if ((R[r] | C[c] | B[b]) & bit) return 0;
      R[r] |= bit; C[c] |= bit; B[b] |= bit;
    }
    let say = 0;
    const git = () => {
      let en = -1, enM = 0, enN = 99;
      for (let i = 0; i < g.length; i++) {
        if (g[i]) continue;
        const m = full & ~(R[Math.floor(i / size)] | C[i % size] | B[kutu(i)]);
        let n = 0; for (let x = m; x; x &= x - 1) n++;
        if (n === 0) return;
        if (n < enN) { en = i; enM = m; enN = n; if (n === 1) break; }
      }
      if (en < 0) { say++; return; }
      const r = Math.floor(en / size), c = en % size, b = kutu(en);
      for (let v = 0; v < size && say < limit; v++) {
        const bit = 1 << v; if (!(enM & bit)) continue;
        g[en] = v + 1; R[r] |= bit; C[c] |= bit; B[b] |= bit;
        git();
        g[en] = 0; R[r] &= ~bit; C[c] &= ~bit; B[b] &= ~bit;
      }
    };
    git();
    return say;
  }
  // Dolu geçerli tablo üretir, sonra tek çözüm korunarak en çok `blanks` kutu boşaltır.
  function sudokuUret(size, blanks, r = Math.random) {
    const [bw, bh] = KUTU[size];
    const sira = (grup, adet) => karistir(Array.from({ length: adet }, (_, i) => i), r).flatMap(g => karistir(Array.from({ length: grup }, (_, i) => g * grup + i), r));
    const satir = sira(bh, size / bh), sutun = sira(bw, size / bw), rakam = karistir(Array.from({ length: size }, (_, i) => i + 1), r);
    const cozum = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const rr = satir[y], cc = sutun[x];
      cozum.push(rakam[(bw * (rr % bh) + Math.floor(rr / bh) + cc) % size]);
    }
    const bulmaca = cozum.slice();
    let bos = 0;
    for (const i of karistir(Array.from({ length: size * size }, (_, k) => k), r)) {
      if (bos >= blanks) break;
      const v = bulmaca[i]; bulmaca[i] = 0;
      if (sudokuSay(bulmaca, size, 2) === 1) bos++; else bulmaca[i] = v;
    }
    return { cozum, bulmaca };
  }

  // Kelime Avı
  const TR_HARF = 'AAAAEEEEİİİIIKKLLMNNRRSTTUÜOÖYBDÇŞZGĞHPCVF';
  const YON = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]]; // sağ, aşağı, iki çapraz, sonra tersleri
  function kelimeSec(havuz, adet, enUzun, r = Math.random) {
    const uygun = havuz.filter(w => !w.includes(' ') && [...w].length >= 3 && [...w].length <= enUzun).map(w => w.toLocaleUpperCase('tr'));
    return karistir([...new Set(uygun)], r).slice(0, adet);
  }
  // Kelimeleri tabloya yerleştirir (ortak harfte kesişebilirler), boşları rastgele harfle doldurur. Sığmayan kelime atlanır.
  function kelimeAvi(n, kelimeler, dirs, r = Math.random) {
    const grid = new Array(n * n).fill(''), yerler = [], yon = YON.slice(0, dirs);
    for (const w of kelimeler.slice().sort((a, b) => [...b].length - [...a].length)) {
      const harf = [...w];
      for (let deneme = 0; deneme < 300; deneme++) {
        const [dx, dy] = yon[Math.floor(r() * yon.length)];
        const x0 = Math.floor(r() * n), y0 = Math.floor(r() * n), x1 = x0 + dx * (harf.length - 1), y1 = y0 + dy * (harf.length - 1);
        if (x1 < 0 || x1 >= n || y1 < 0 || y1 >= n) continue;
        const cells = harf.map((_, i) => (y0 + dy * i) * n + x0 + dx * i);
        if (!cells.every((c, i) => grid[c] === '' || grid[c] === harf[i])) continue;
        cells.forEach((c, i) => { grid[c] = harf[i]; });
        yerler.push({ w, cells });
        break;
      }
    }
    for (let i = 0; i < grid.length; i++) if (grid[i] === '') grid[i] = [...TR_HARF][Math.floor(r() * [...TR_HARF].length)];
    return { grid, yerler };
  }
  // a kutusundan b kutusuna düz çizgi (yatay, dikey, çapraz) varsa kutuları sırayla verir; yoksa null
  function kelimeHat(n, a, b) {
    const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n), dx = bx - ax, dy = by - ay;
    if ((dx === 0 && dy === 0) || !(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
    const adim = Math.max(Math.abs(dx), Math.abs(dy)), sx = Math.sign(dx), sy = Math.sign(dy);
    return Array.from({ length: adim + 1 }, (_, i) => (ay + sy * i) * n + ax + sx * i);
  }
  // Seçilen çizgi henüz bulunmamış bir kelimeyi (düz ya da ters) yazıyorsa { idx, cells }, değilse null.
  // Kelimenin yerleştirildiği yere bakmaz: tabloda tesadüfen oluşan ikinci bir kopya da geçerlidir.
  function kelimeEsle(grid, n, yerler, bulundu, a, b) {
    const cells = kelimeHat(n, a, b); if (!cells) return null;
    const duz = cells.map(c => grid[c]).join(''), ters = cells.map(c => grid[c]).reverse().join('');
    const idx = yerler.findIndex((y, i) => !bulundu.has(i) && (y.w === duz || y.w === ters));
    return idx < 0 ? null : { idx, cells };
  }

  // Yapboz: hiçbir parçanın yerinde kalmadığı karışık sıralama
  function yapbozKaristir(N, r = Math.random) {
    for (;;) {
      const p = karistir(Array.from({ length: N }, (_, i) => i), r);
      if (p.every((v, i) => v !== i)) return p;
    }
  }

  // ---------- Serbest Bölüm: oyuncu yoğunluğu kendi seçer ----------
  // Aralıklı ayar: { k, ad, min, max, step?, def, ... } · Seçenekli ayar: { k, ad, sec: [[değer, ad], ...], def }
  const OZEL = {
    sira: [{ k: 'len', ad: 'Sıra uzunluğu', min: 3, max: 10, def: 5, birim: 'kare' }, { k: 'rounds', ad: 'Tur', min: 1, max: 6, def: 3 }, { k: 'grid', ad: 'Tahta', min: 3, max: 5, def: 3, kare: true }],
    renk: [{ k: 'items', ad: 'Kelime', min: 10, max: 40, step: 2, def: 20 }, { k: 'colors', ad: 'Renk', min: 3, max: 6, def: 4 }, { k: 'degis', ad: 'Kural değişimi', sec: [[0, 'Yok'], [1, 'Var']], def: 1 }],
    es: [{ k: 'pairs', ad: 'Kart', min: 3, max: 18, def: 6, carp: 2 }],
    hesap: [{ k: 'ops', ad: 'İşlem', sec: [['+-', 'Toplama-çıkarma'], ['x', 'Çarpma']], def: '+-' }, { k: 'digits', ad: 'Basamak', min: 1, max: 3, def: 2 },
      { k: 'terms', ad: 'Sayı adedi', min: 2, max: 4, def: 2 }, { k: 'questions', ad: 'Soru', min: 5, max: 20, def: 10 }],
    iki: [{ k: 'n', ad: 'Kaç önce', min: 1, max: 4, def: 2 }, { k: 'scored', ad: 'Sembol', min: 10, max: 40, step: 2, def: 20 }],
    goz: [{ k: 'ms', ad: 'Görünme süresi', min: 60, max: 500, step: 20, def: 300, birim: 'ms' }, { k: 'trials', ad: 'Deneme', min: 5, max: 15, def: 8 }, { k: 'positions', ad: 'Konum', sec: [[8, '8'], [12, '12']], def: 8 }],
    saray: [{ k: 'size', ad: 'Kelime', min: 4, max: 16, def: 6 }, { k: 'sn', ad: 'Kelime başına süre', min: 3, max: 8, def: 5, birim: 'sn' }],
    sudoku: [{ k: 'size', ad: 'Tablo', sec: [[4, '4×4'], [6, '6×6'], [9, '9×9']], def: 6 }, { k: 'bos', ad: 'Boş kutu', sec: [[0, 'Az'], [1, 'Orta'], [2, 'Çok']], def: 1 }],
    kelime: [{ k: 'n', ad: 'Tablo', min: 6, max: 10, def: 8, kare: true }, { k: 'words', ad: 'Kelime', min: 3, max: 10, def: 6 }, { k: 'dirs', ad: 'Yönler', sec: [[2, 'Düz'], [4, 'Çapraz'], [8, 'Ters de']], def: 2 }],
    yapboz: [{ k: 'cols', ad: 'Sütun', min: 2, max: 7, def: 4 }, { k: 'rows', ad: 'Satır', min: 2, max: 7, def: 4 }],
  };
  // Kayıtlı/girilen değerleri sınırlara çeker; eksik ya da bozuk olanı varsayılana döndürür
  function customValues(id, raw) {
    const v = {};
    for (const c of OZEL[id]) {
      const x = raw ? raw[c.k] : undefined;
      if (c.sec) v[c.k] = c.sec.some(([val]) => val === x) ? x : c.def;
      else {
        const st = c.step || 1, n = Number(x);
        v[c.k] = x === undefined || x === null || !Number.isFinite(n) ? c.def : clamp(c.min + Math.round((n - c.min) / st) * st, c.min, c.max);
      }
    }
    if (id === 'sira') v.len = Math.min(v.len, v.grid * v.grid - 1);
    if (id === 'hesap' && v.ops === 'x') { v.digits = Math.min(v.digits, 2); v.terms = 2; }
    return v;
  }
  function customParams(id, raw) {
    const v = customValues(id, raw);
    switch (id) {
      case 'sira': return { len: v.len, grid: v.grid, rounds: v.rounds, onMs: 560, maxMistakes: 2 };
      case 'es': return { pairs: v.pairs, maxMoves: Math.ceil(v.pairs * 2.6) };
      case 'hesap': {
        const x = v.ops === 'x', d = x ? [v.digits, 1] : Array(v.terms).fill(v.digits);
        const sec = x ? (v.digits === 2 ? 9 : 5) : 2 + v.digits * 2 + (v.terms - 2) * 2;
        return { d, ops: v.ops, sec, questions: v.questions, time: v.questions * sec, maxWrong: Math.floor(v.questions * 0.25) };
      }
      case 'renk': return { colors: v.colors, items: v.items, switchP: v.degis ? 0.25 : 0, time: Math.round(v.items * 2.2), maxWrong: Math.floor(v.items * 0.2) };
      case 'iki': return { n: v.n, scored: v.scored, showMs: 1600 };
      case 'goz': return { ms: v.ms, trials: v.trials, positions: v.positions, animals: v.positions === 12 ? 6 : 4 };
      case 'saray': return { size: v.size, studyMs: v.sn * 1000 };
      case 'sudoku': return { size: v.size, blanks: Math.round(v.size * v.size * [0.35, 0.5, 0.6][v.bos]), maxMistakes: 3 };
      case 'kelime': return { n: v.n, words: v.words, dirs: v.dirs, time: v.words * 25 + v.n * 5 };
      case 'yapboz': return { cols: v.cols, rows: v.rows, maxMoves: Math.ceil(v.cols * v.rows * 2.4) };
    }
    return null;
  }

  const ZM = { OZEL, customValues, customParams, dayKey, dayNum, streak, dailyGames, loadState, clamp, nbackSeq, nbackTargets, pickWords, recallScore, pendingRecall, YERLER,
    weekProgress, SLOTS, inSlot, mascot, shareText,
    LEVELS, START, levelParams, rate, applyResult, skipAhead, totalStars, starOfDay, hesapSoru, esCols,
    rng, KUTU, sudokuSay, sudokuUret, kelimeSec, kelimeAvi, kelimeHat, kelimeEsle, yapbozKaristir };
  g.ZM = Object.assign(g.ZM || {}, ZM);
  if (typeof module !== 'undefined' && module.exports) module.exports = g.ZM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
