# Zihin Molası — 3. tur: bölümler (kısa tasarım)

Tarih: 13.11.2026 · İstek: "bütün bölümlerde seviyeler; zorluk değil yoğunluk artsın (kart sayısı, işlem basamağı);
50–100 bölüm; ya da girişte seçilen zorluğa göre bölüm yaratılsın"

## Karar: ikisi birlikte
- Her oyunda **100 bölüm**. Bölüm, numarasından üretilir (`ZM.levelParams(oyun, n)`); 10 bölümlük kademe (t) + kademe içi adım (s).
- Oyuna ilk girişte **"Nereden başlayalım?"**: Bölüm 1 / 21 / 41. Haritada "10 bölüm ileri atla".
- Bölüm sonucu **0–3 yıldız** (`ZM.rate`); en az 1 yıldız sonraki bölümü açar (`ZM.applyResult`). Kayıt: `S.bolum[oyun] = {cur, st}`.
- Günün Molası ve mini mola, her oyunda oyuncunun **sıradaki bölümünü** oynatır. Bölüm geçilemese de mola devam eder.
- Eski "uyarlamalı zorluk" ve "rekor/skor" kalktı; yerini bölüm + yıldız aldı. Eski kayıtlardaki günler (seri) korunur.

## Yoğunluk nasıl artıyor
| Oyun | Bölüm 1 | Bölüm 100 |
|---|---|---|
| Eşini Bul | 6 kart | 36 kart (6 bölümde bir +2 kart; hamle hakkı daralır) |
| Hızlı Hesap | 6 soru, 1 basamak ± | 15 soru, 4 sayılı 2 basamak ±; arada 2–3 basamak, çarpma |
| Sıra Hafızası | 3 kare × 2 tur, 3×3 | 9 kare × 4 tur, 5×5 |
| Renk Tuzağı | 10 kelime, 3 renk | 28 kelime, 6 renk, kural değişir |
| İki Önce | 1 önce, 11 sembol | 4 önce, 32 sembol |
| Göz Ucu | 6 deneme, 400 ms, 8 konum | 10 deneme, 60 ms, 12 konum |
| Hafıza Sarayı | 4 kelime | 14 kelime (16 yer) |

## Hedef dışı
Günün Kelimeleri sabit 6 kelime kalır. Bölümler arası hikâye/tema yok.
