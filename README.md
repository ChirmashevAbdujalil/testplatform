# Test savollari to‘plami — test platformasi

HTML, CSS va JavaScript’da yozilgan, serversiz ishlaydigan test platformasi.
Savollar `Test_savollari_toplami.docx` faylidan olingan: **1589 ta savol, 7 ta bo‘lim**
(fayldagi `+` belgili variant — to‘g‘ri javob).

## Ishga tushirish
`index.html` faylini brauzerda oching — bo‘ldi. Internet shart emas (faqat shriftlar uchun).

## Imkoniyatlar
- **Bo‘lim bo‘yicha** — bitta bo‘limni tanlab, uning hamma yoki kerakli sondagi savollarini ishlash.
- **Barcha savollar** — 1589 ta savolning hammasi birdaniga.
- **Tasodifiy savollar** — savollar sonini o‘zingiz kiritasiz (bo‘limlarni ham tanlash mumkin), dastur ularni tasodifiy tanlab beradi.
- Variant bosilishi bilan javob qulflanadi: tanlangan variant (to‘g‘ri — yashil, xato — qizil) va
  xato bo‘lsa to‘g‘ri javob ham o‘sha yerning o‘zida ko‘rsatiladi.
- **“Keyingisi”** tugmasi javob tanlanmaguncha ishlamaydi.
- Savollar va variantlarni aralashtirish, savollar xaritasi, taymer, to‘g‘ri/xato hisoblagichi.
- Natija sahifasi: foiz, xatolar tahlili, xatolarni qayta ishlash.
- Xatolar banki, o‘zlashtirish darajasi, oxirgi natijalar va tugallanmagan testni davom ettirish (brauzerda saqlanadi).
- Kun/tun rejimi, telefon uchun moslashgan, klaviatura: `1–4` / `A–D` javob, `Enter` keyingi.

## Savollarni yangilash
Word faylni o‘zgartirsangiz, savollarni qayta yarating:

```bash
python3 tools/docx_to_questions.py "Test_savollari_toplami.docx" questions.js
```

## Fayllar
| Fayl | Vazifasi |
|---|---|
| `index.html` | Sahifa tuzilmasi |
| `style.css` | Dizayn |
| `app.js` | Test mantiqi |
| `questions.js` | Savollar bazasi (avtomatik yaratilgan) |
| `tools/docx_to_questions.py` | .docx → questions.js konvertori |
