# Zihin Molası — 4. tur: Serbest Bölüm ve Bulmacalar (kısa tasarım)

Tarih: 13.11.2026

## Serbest Bölüm ("Kendin kur")
Oyuncu yoğunluğu artı-eksi ile seçer (`ZM.OZEL`, `ZM.customParams`). Yıldız verir, seriye sayılır, 100 bölümlük ilerlemeyi etkilemez.
Ana sayfada kart + her bölüm haritasında düğme.

## Bulmacalar (istek: "puzzle ve bulmaca da ekle, beyin eğitimine yarayacak")
Günün Molası'na girmez (uzun sürebilir); ana sayfada ayrı "Bulmacalar" bölümü. Hepsinde 100 bölüm + Kendin kur.
- **Sudoku** (mantık): 4×4 → 6×6 → 9×9; boş kutu artar. Tek çözüm garantili üretici (`ZM.sudokuUret`). 3 hata hakkı.
- **Kelime Avı** (dil/tarama): 6×6 → 10×10 tablo, 3 → 10 kelime; yönler düz → çapraz → ters. Süreli; yıldız kalan süreye göre.
  Tabloda tesadüfen oluşan ikinci kopya da kabul edilir (`ZM.kelimeEsle`).
- **Yapboz** (görsel-mekânsal): 6 → 49 parça; iki parçaya dokununca yer değiştirir. Resim bölüm numarasından üretilir (tuvale çizilir).

## Araştırma (Bilim sayfasına eklendi; iddiasız)
Brooker ve ark. 2019 (sayı/kelime bulmacası sıklığı ↔ bilişsel test sonuçları; kesitsel, nedensellik yok),
Devanand ve ark. 2022 (hafif bilişsel bozuklukta bulmaca > bilgisayar oyunları), Fissler ve ark. 2018 (yapboz çok beceri kullandırır;
30 günlük müdahale tek başına belirgin fark yaratmadı).
