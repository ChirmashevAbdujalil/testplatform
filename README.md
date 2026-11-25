# Test savollari to‘plami — test platformasi

HTML, CSS va JavaScript’da yozilgan, serversiz ishlaydigan test platformasi.
Savollar `sources/` papkadagi Word fayllardan olingan: **1788 ta savol, 9 ta bo‘lim**
(fayldagi `+` belgili variant — to‘g‘ri javob):
- `Test_savollari_toplami.docx` — 1–7-bo‘limlar, 1589 ta savol;
- `Test_savollari_chiqish_tayyor.docx` — 8-bo‘lim “Chiqish test savollari”, 130 ta savol;
- `Boshqaruv_psixologiyasi_test.docx` — 9-bo‘lim “Boshqaruv psixologiyasi va liderlik”, 69 ta savol.

## Ishga tushirish
`index.html` faylini brauzerda oching — bo‘ldi. Internet shart emas (faqat shriftlar uchun).

## Imkoniyatlar
- **Bo‘lim bo‘yicha** — bitta bo‘limni tanlab, uning hamma yoki kerakli sondagi savollarini ishlash.
- **Barcha savollar** — 1788 ta savolning hammasi birdaniga.
- **Tasodifiy savollar** — savollar sonini o‘zingiz kiritasiz (bo‘limlarni ham tanlash mumkin), dastur ularni tasodifiy tanlab beradi.
- Variant bosilishi bilan javob qulflanadi: tanlangan variant (to‘g‘ri — yashil, xato — qizil) va
  xato bo‘lsa to‘g‘ri javob ham o‘sha yerning o‘zida ko‘rsatiladi.
- **“Keyingisi”** tugmasi javob tanlanmaguncha ishlamaydi.
- Savollar va variantlarni aralashtirish, savollar xaritasi, taymer, to‘g‘ri/xato hisoblagichi.
- Natija sahifasi: foiz, xatolar tahlili, xatolarni qayta ishlash.
- Xatolar banki, o‘zlashtirish darajasi, oxirgi natijalar va tugallanmagan testni davom ettirish (brauzerda saqlanadi).
- Kun/tun rejimi, telefon uchun moslashgan, klaviatura: `1–4` / `A–D` javob, `Enter` keyingi.

## Savollarni yangilash
Word fayllarni o‘zgartirsangiz, savollarni qayta yarating:

```bash
python3 tools/docx_to_questions.py questions.js sources/Test_savollari_toplami.docx "sources/Test_savollari_chiqish_tayyor.docx::Chiqish test savollari" sources/Boshqaruv_psixologiyasi_test.docx
```

`fayl.docx::Nom` ko‘rinishida berilgan fayldagi hamma savollar “Nom” degan bitta bo‘limga birlashtiriladi.
Yangi fayl qo‘shish uchun uni buyruq oxiriga qo‘shing.

## Fayllar
| Fayl | Vazifasi |
|---|---|
| `index.html` | Sahifa tuzilmasi |
| `style.css` | Dizayn |
| `app.js` | Test mantiqi |
| `questions.js` | Savollar bazasi (avtomatik yaratilgan) |
| `tools/docx_to_questions.py` | .docx → questions.js konvertori |
| `sources/` | Asl Word fayllar |
