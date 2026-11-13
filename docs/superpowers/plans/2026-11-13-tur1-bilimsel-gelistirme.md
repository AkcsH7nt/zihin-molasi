# Zihin Molası 1. tur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Günün Kelimeleri, Hafıza Sarayı, İki Önce, Göz Ucu, kalıcı zorluk, bağışlayan seri ve bilim notlarını eklemek.

**Architecture:** Saf mantık (`mantik.js`, tarayıcıda `window.ZM`, Node'da `module.exports`) ayrı dosyaya çıkar ve
`node --test` ile sınanır; ekranlar `index.html` içinde kalır ve tarayıcıda (375×812) elle/komutla doğrulanır.

**Tech Stack:** Düz HTML/CSS/JS, localStorage, service worker, Node 18+ `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-13-tur1-bilimsel-gelistirme-design.md`

## Global Constraints
- Tek sayfa `index.html` + `mantik.js`; derleme aracı yok. `sw.js` `SURUM` her yayında artar, `DOSYALAR`'a `mantik.js` eklenir.
- Kayıt anahtarı `zihinmolasi.v1` korunur; yeni alanlar (`lvl`, `words`) yoksa varsayılanla oluşturulur.
- Metinler Türkçe, sıcak/esprili; hiçbir tıbbi veya iş performansı iddiası yok.
- Günün Molası toplam ≤ 6 dk; ses varsayılan kapalı.

## Review Focus
- Eski kaydı olan kullanıcı (lvl/words alanı yok) → uygulama açılmalı, hata vermemeli. Test: `loadState({hist:[...]})` varsayılanları doldurur (Task 1).
- Dün mola yapılmamışsa "Dünün kelimeleri" sorulmamalı; aynı gün iki kez sorulmamalı. Test: `pendingRecall` (Task 5).
- Gece yarısı (23:59 → 00:01) tarih değişimi: seri ve günlük kelimeler yerel tarihe göre. Test: `streak` yerel `dayKey` ile (Task 1).
- Göz Ucu süresi çok kısa düşüp oynanamaz hale gelmemeli (alt sınır 50 ms). Test: `gozAdapt` sınırları (Task 4).
- Hatırlamada 6'dan fazla seçim → engellenir; hiç seçmeden kontrol → 0 puan, hata yok. Test: `recallScore` (Task 5).

---

### Task 1: Mantık modülü, test düzeni, bağışlayan seri, 6 oyunlu günlük döngü

**Files:** Create `mantik.js`, `test/mantik.test.js`, `package.json` (`"test": "node --test"`); Modify `index.html` (streak/dailyGames/dayKey/dayNum/kayıt yükleme `ZM`'den), `sw.js`.

**Interfaces — Produces (`ZM.*`):**
- `dayKey(d: Date) -> 'YYYY-MM-DD'` (yerel), `dayNum(d: Date) -> int`
- `streak(days: Set<string>, today: Date) -> {n: int, shielded: bool}` — bugün oynanmadıysa dünden sayar; ardışık sayımda 7 günlük pencerede en fazla 1 boş gün atlanır (atlanan gün sayıya eklenmez), `shielded` o boşluk kullanıldıysa true.
- `dailyGames(dn: int, ids: string[], k=3) -> string[]` — `ids[(dn+i) % len]`, i=0..k-1.
- `loadState(raw) -> state` — `{hist:[], daily:{}, sound:false, hideInstall:false, lvl:{}, words:{}}` varsayılanları.

- [ ] Step 1: Testler: `streak` → [bugün,dün,önceki]=3; [bugün, 2 gün önce, 3 gün önce]=3 & shielded; [bugün, 2 ve 4 gün önce] → 2 (ikinci boşluk aynı 7 gün içinde) ; boş=0. `dailyGames(5, ['a','b','c','d','e','f'])` = `['f','a','b']`. `loadState(null).lvl` = `{}`; `loadState({hist:[1]}).hist.length`=1.
- [ ] Step 2: `npm test` → FAIL (modül yok).
- [ ] Step 3: `mantik.js` yaz (UMD: `(function(g){const ZM={...}; g.ZM=ZM; if(typeof module!=='undefined')module.exports=ZM})(globalThis)`); `index.html` `<script src="mantik.js">` ile kullanır; ana sayfada `shielded` ise "🛡 1 gün koruma kullanıldı" küçük notu.
- [ ] Step 4: `npm test` → PASS; tarayıcıda ana sayfa açılır, konsol temiz.
- [ ] Step 5: Commit `feat: mantık modülü, bağışlayan seri`.

### Task 2: Kalıcı zorluk

**Files:** Modify `mantik.js`, `test/mantik.test.js`, `index.html` (sira, hesap).
**Interfaces — Produces:** `startLevel(saved: number|undefined, min: number, max: number) -> number` = saved yoksa min, varsa `clamp(saved-1, min, max)`.
Oyun bitince `S.lvl[id]` = ulaşılan en yüksek seviye (sira: en uzun doğru sıra uzunluğu; hesap: `top`). sira başlangıç `startLevel(S.lvl.sira,3,9)`, hesap `startLevel(S.lvl.hesap,1,4)`.

- [ ] Step 1: Test: `startLevel(undefined,3,9)=3`, `startLevel(7,3,9)=6`, `startLevel(3,3,9)=3`, `startLevel(20,1,4)=4`.
- [ ] Step 2: FAIL → Step 3: uygula → Step 4: PASS + tarayıcıda sira 5'e ulaşınca sonraki oyun "Sıra 4" ile başlar.
- [ ] Step 5: Commit `feat: zorluk kaldığı yerden devam eder`.

### Task 3: İki Önce (n-back)

**Files:** Modify `mantik.js`, test, `index.html` (`GAMES.iki`, `ICON.iki`, `ORDER`).
**Interfaces — Produces:** `nbackSeq(n, len, rng=Math.random) -> int[]` (semboller 0..7; n'den sonraki konumların ~%30'u hedef, ardışık aynı üretim hedef dışında kaçınılır), `nbackTargets(seq, n) -> bool[]`, `nbackAdapt(n, acc) -> n` (acc ≥ .8 → n+1, < .5 → n-1, sınır 1..4).
Oyun: 3 blok × (n+15) uyaran, her uyaran 2,2 sn (500 ms boşluk); tek büyük düğme "Eşleşiyor!". Doğru = hedefte basma veya hedef değilken basmama; blok sonunda `nbackAdapt`. Puan = Σ blok (doğru isabet × n) − yanlış alarm, ≥0. Başlangıç n = `startLevel(S.lvl.iki,1,4)`; sonda `S.lvl.iki` = en yüksek n.
Bilim: "Çalışma belleği için en çok kullanılan araştırma görevi."

- [ ] Step 1: Test: `nbackSeq(2,17)` uzunluk 17, tüm değerler 0..7; 200 tekrar ortalaması hedef oranı .2–.4; `nbackTargets([1,2,1,3],2)` = `[f,f,t,f]`; `nbackAdapt(1,.9)=2`, `(4,.95)=4`, `(1,.3)=1`, `(3,.4)=2`.
- [ ] Step 2: FAIL → Step 3: uygula → Step 4: PASS + tarayıcıda blok geçişinde "2 önce" yazısı.
- [ ] Step 5: Commit `feat: İki Önce oyunu`.

### Task 4: Göz Ucu (algı hızı)

**Files:** Modify `mantik.js`, test, `index.html` (`GAMES.goz`).
**Interfaces — Produces:** `gozAdapt(ms, ok, run) -> {ms, run}` — doğru: run+1, run==2 olunca ms×0.8 ve run=0; yanlış: ms×1.25, run=0; sınır 50..600. `gozScore(trials:[{ok,ms}]) -> int` = Σ doğru `max(1, round((600-ms)/10))`.
Oyun: 15 deneme. Ortada 4 hayvandan biri (🐱🐶🐰🦊), 8 kenar konumdan birinde ⭐; `ms` kadar göster, sonra 300 ms maske (▦ desen), sonra iki soru: "Ortada ne vardı?" (4 seçenek) ve "Yıldız neredeydi?" (8 konum). İkisi de doğruysa ok. Başlangıç ms = `S.lvl.goz` varsa ×1.25 (≤600), yoksa 350; sonda `S.lvl.goz` = en kısa başarılı ms.
Bilim: "Algı hızı antrenmanı, uzun vadeli etkisi en çok araştırılan beyin egzersizlerindendir (ACTIVE çalışması)."

- [ ] Step 1: Test: `gozAdapt(300,true,1)` → `{ms:240,run:0}`; `gozAdapt(300,false,1)` → `{ms:375,run:0}`; `gozAdapt(55,true,2).ms`=50; `gozAdapt(550,false,0).ms`=600; `gozScore([{ok:true,ms:100},{ok:false,ms:50}])`=50.
- [ ] Step 2–4: FAIL → uygula → PASS + tarayıcıda gösterimin kısaldığı görülür.
- [ ] Step 5: Commit `feat: Göz Ucu oyunu`.

### Task 5: Günün Kelimeleri (hatırlama + aralıklı tekrar)

**Files:** Create `kelimeler.js` (`ZM.KELIMELER`: ~120 somut, gözde canlanan Türkçe isim: elma, şemsiye, zürafa…); Modify `mantik.js`, test, `index.html`, `sw.js`.
**Interfaces — Produces:** `pickWords(pool, n, rng, exclude:Set) -> string[]` (tekrarsız), `recallScore(chosen:string[], targets:string[]) -> int` = isabet − yanlış, ≥0, chosen 6'dan fazlaysa ilk 6, `pendingRecall(words, today) -> 'YYYY-MM-DD'|null` = dünün kaydı var ve `next` alanı yoksa dünün anahtarı.
Kayıt: `S.words[gün] = {w:[6], now: puan|undefined, next: puan|undefined}`.
Akış (Günün Molası): [varsa Dünün Kelimeleri hatırlama] → bugünün 6 kelimesi 20 sn ("Kafanda bir hikâye kur") → 3 oyun → hatırlama (6 hedef + 6 çeldirici, karışık 3×4 kutu, en fazla 6 seç, "Kontrol et") → özet. Hatırlama sonucu ekranı doğru/yanlış/kaçanları renkle gösterir. Özet ekranına kelime puanı eklenir.

- [ ] Step 1: Test: `pickWords` 6 tekil, exclude'dakileri içermez; `recallScore(['a','b','x'],['a','b','c'])=1`; `recallScore([], [...])=0`; 8 seçim ilk 6'ya kırpılır; `pendingRecall({'2026-11-12':{w:[...]} }, 13 Kasım)`='2026-11-12'; `next` doluysa null; dün kaydı yoksa null.
- [ ] Step 2–4: FAIL → uygula → PASS + tarayıcıda tam mola akışı; ertesi gün simülasyonu (localStorage'a dünün kaydı yazılarak) "Dünün kelimeleri" çıkar.
- [ ] Step 5: Commit `feat: Günün Kelimeleri`.

### Task 6: Hafıza Sarayı (ders + alıştırma)

**Files:** Modify `mantik.js`, test, `index.html` (ana sayfa kartı + `renderSaray*` ekranları).
**Interfaces — Produces:** `ZM.YERLER` = ['Bina kapısı','Danışma','Merdiven','Asansör','Koridor','Çay ocağı','Senin masan','Pencere','Dolap','Toplantı odası']; `palaceSize(level) -> 3+level` (level 1..7).
Ders: 4 kısa ekran (1: Beyin yerleri iyi hatırlar; 2: Her gün yürüdüğün güzergâh = sarayın; 3: Kelimeyi o yerde abartılı canlandır, örnek "Danışmada dev bir muz sırıtıyor"; 4: Hatırlarken güzergâhı yürü). Sonra alıştırma: her yer+kelime 5 sn ("Canlandır!" ilerleme çubuğu), ardından her yer için 4 seçenekten doğru kelime. Hepsi doğruysa `S.lvl.saray`+1 (≤7), yarıdan azsa −1 (≥1). Sonuç `S.hist` içine `g:'saray'` (Günün Molası döngüsüne girmez, ana sayfada ayrı kart). Ders bir kez gösterilir, sonra "Dersi tekrar gör" bağlantısı.
Bilim: Dresler ve ark. 2017.

- [ ] Step 1: Test: `palaceSize(1)=4`, `palaceSize(7)=10`, `YERLER.length >= palaceSize(7)`.
- [ ] Step 2–4: FAIL → uygula → PASS + tarayıcıda ders + alıştırma + seviye artışı.
- [ ] Step 5: Commit `feat: Hafıza Sarayı`.

### Task 7: Bilim notları, yayın

**Files:** Modify `index.html` (`GAMES[*].bilim` metni nasıl-oynanır ekranında küçük kutu; ana sayfada "Bilim ne diyor?" sayfası: 5-6 madde + kaynak bağlantıları, sağlık iddiası olmadığına dair not), `sw.js` (SURUM 'zm-3', DOSYALAR + mantik.js, kelimeler.js).

- [ ] Step 1: `npm test` PASS; tarayıcıda 375×812: tüm 6 oyun + saray + bilim sayfası, konsol temiz, eski kayıtla açılış.
- [ ] Step 2: Commit + `git push`; canlı adreste service worker 'zm-3' ve dosyalar 200.
