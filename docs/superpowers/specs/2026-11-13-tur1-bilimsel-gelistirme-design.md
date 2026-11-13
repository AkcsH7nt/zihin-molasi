# Zihin Molası — 1. tur: bilime dayalı geliştirme (tasarım)

Tarih: 13.11.2026 · Kullanıcı onayı: "Devam" (sohbette)

## Niyet
25-35 yaş memurlar (çoğu kadın) için günde ~4-6 dakikalık, eğlenceli beyin jimnastiği. Kullanıcı prototipi
(4 oyun, Günün Molası, seri) "mükemmel" buldu; araştırmaya dayanarak geliştirilmesini istedi.

## Araştırmadan çıkan ilkeler
- Oyun, çalışılan beceriyi geliştirir; günlük hayata aktarım zayıf (Simons 2016, Owen 2010, Melby-Lervåg 2016).
  → Sağlık/iş performansı iddiası YOK (Lumosity–FTC 2016).
- Günlük hafızaya en sağlam etki: hafıza teknikleri (loci — Dresler 2017), hatırlama denemesi (Roediger & Karpicke 2006),
  aralıklı tekrar (Cepeda 2006).
- Algı hızı antrenmanı en güçlü uzun vadeli kanıta sahip (ACTIVE, Edwards 2017; yaşlılarda).
- n-back: küçük, tartışmalı etki (Au 2015) ama standart çalışma belleği görevi.
- Zorlayıcı ve yeni olan işe yarar (Park 2014) → zorluk uyarlamalı ve kalıcı.
- Bir gün kaçırmak alışkanlığı bozmaz (Lally 2010) → bağışlayan seri.

## Hedefler (1. tur)
1. **Günün Kelimeleri**: Günün Molası 6 kelimeyle (20 sn inceleme) açılır; oyunlardan sonra hatırlama sorulur
   (12 kelimelik tablodan 6'sını seç). Ertesi gün mola başında "Dünün kelimeleri" tekrar sorulur (aralıklı tekrar).
2. **Hafıza Sarayı**: ana sayfadan açılan kısa ders (4 ekran) + alıştırma: ofis güzergâhı (Kapı, Danışma, Merdiven,
   Çay ocağı, Masan, Pencere…). Kelime yere yerleştirilir, sonra sırayla hatırlanır. Kelime sayısı seviyeyle artar.
3. **İki Önce (n-back)**: semboller tek tek gelir; "Eşleşiyor" düğmesi. 1-back'ten başlar, başarıya göre N artar/azalır.
4. **Göz Ucu (algı hızı)**: ortada bir hayvan + 8 kenar konumdan birinde yıldız çok kısa görünür, maskelenir;
   önce ortadakini seç, sonra yıldızın yerini. Gösterim süresi başarıya göre kısalır.
5. **Kalıcı zorluk**: her oyunun seviyesi kaydedilir; bir sonraki oyunda oradan (bir tık altından) başlar.
6. **Bağışlayan seri**: 7 gün içinde 1 boş gün seriyi bozmaz ("koruma" göstergesi).
7. **Bilim ne diyor?**: her oyunun anlatım ekranında tek cümle + kaynak; ana sayfada kısa "Bilim" sayfası.

## Hedef dışı
Nefes/hareket molası, isim-numara oyunu, beceri profili (2. tur). Sunucu, hesap, sıralama tablosu yok.

## Anti-hedefler
- Tıbbi/terapötik iddia ("unutkanlığı önler", "IQ artırır").
- Ders havası, uzun okuma; oturum 6 dakikayı geçmemeli.
- Mevcut kayıtların (localStorage `zihinmolasi.v1`) bozulması.

## Kısıtlar
Tek `index.html` (düz JS), çevrimdışı (sw.js SURUM artırılır), Android Chrome + iPhone Safari, Türkçe, ses varsayılan kapalı.

## Yaklaşımlar
- **A (seçilen)**: Mevcut tek dosyayı genişlet; oyunlar `GAMES` kaydına eklenir, Günün Molası "kelime → 3 oyun → hatırlama"
  akışına döner. Basit, yayın aynı kalır.
- B: Dosyalara bölmek/derleme aracı — bu boyutta gereksiz karmaşa.
- C: Ayrı "Hafıza Okulu" uygulaması — kullanıcı tek uygulama istiyor.

## Builder'a kalanlar (benim kararlarım)
Kelime havuzu (somut, gözde canlanan Türkçe isimler ~120), sembol setleri, puanlama formülleri, seviye eşikleri.
Günün Molası oyun seçimi: 6 oyundan her gün dönen 3'ü.
