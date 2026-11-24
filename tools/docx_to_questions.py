"""Word (.docx) fayldagi test savollarini questions.js ga aylantiradi.

Ishlatish:
    python3 tools/docx_to_questions.py questions.js "Test_savollari_toplami.docx" \
        "Test_savollari_chiqish_tayyor.docx::Chiqish test savollari"

Bir nechta fayl berish mumkin. "fayl.docx::Nom" ko'rinishida berilsa, shu fayldagi
barcha savollar "Nom" degan bitta bo'limga birlashtiriladi (raqamlar ketma-ket).

Format: Heading1 uslubidagi sarlavha = bo'lim, "N. savol" = savol,
"A) ... D)" = variantlar, oldida "+" bo'lgan variant = to'g'ri javob.
"""
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
Q_RE = re.compile(r"^(\d+)\.\s*(.*)$", re.S)
O_RE = re.compile(r"^\s*(\+?)\s*([A-Da-d])\)\s*(.*)$", re.S)


def paragraphs(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    for p in root.find(W + "body").iter(W + "p"):
        text = "".join(t.text or "" for t in p.iter(W + "t"))
        style = p.find(f"{W}pPr/{W}pStyle")
        yield (style.get(W + "val") if style is not None else ""), text


def parse(path):
    sections, sec, q, problems = [], None, None, []
    for style, text in paragraphs(path):
        t = text.strip()
        if style == "Title" or not t:
            continue
        if style.startswith("Heading"):
            m = re.match(r"^(\d+)\.\s*(.*)$", t)
            sec = {"id": int(m.group(1)) if m else len(sections) + 1,
                   "title": (m.group(2) if m else t).strip(), "q": []}
            sections.append(sec)
            q = None
            continue
        if sec is None or re.match(r"^\d+ ta savol$", t):
            continue
        om = O_RE.match(t)
        if om and q is not None and len(q[2]) < 4 and om.group(2).upper() == "ABCD"[len(q[2])]:
            if om.group(1):
                q[3] = len(q[2])
            q[2].append(om.group(3).strip())
            continue
        qm = Q_RE.match(t)
        if qm and (q is None or len(q[2]) == 4):
            q = [int(qm.group(1)), qm.group(2).strip(), [], -1]
            sec["q"].append(q)
            continue
        if q is not None:  # ko'p qatorli matn davomi
            if q[2]:
                q[2][-1] += "\n" + t
            else:
                q[1] += "\n" + t
    for s in sections:
        for q in s["q"]:
            if len(q[2]) != 4 or q[3] < 0:
                problems.append(f"{s['id']}-bo'lim, {q[0]}-savol")
    return sections, problems


def load(arg):
    path, _, merged_title = arg.partition("::")
    sections, problems = parse(path)
    if merged_title:
        qs = [q for sec in sections for q in sec["q"]]
        for i, q in enumerate(qs, 1):
            q[0] = i
        sections = [{"id": 0, "title": merged_title.strip(), "q": qs}]
    return sections, [f"{path}: {p}" for p in problems]


def main():
    if len(sys.argv) < 3 or not sys.argv[1].endswith(".js"):
        sys.exit(__doc__)
    dst, sources = sys.argv[1], sys.argv[2:]
    sections, problems = [], []
    for arg in sources:
        secs, probs = load(arg)
        sections += secs
        problems += probs
    for i, sec in enumerate(sections, 1):
        sec["id"] = i
    if problems:
        print("Diqqat, quyidagi savollarda muammo bor:", *problems, sep="\n  ")
    payload = json.dumps({"sections": sections}, ensure_ascii=False, separators=(",", ":"))
    with open(dst, "w", encoding="utf-8") as f:
        f.write("/* Avtomatik yaratilgan: tools/docx_to_questions.py */\n")
        f.write("window.TEST_DATA = " + payload + ";\n")
    for sec in sections:
        print(f"  {sec['id']}. {sec['title']} — {len(sec['q'])} ta savol")
    total = sum(len(s["q"]) for s in sections)
    print(f"{len(sections)} ta bo'lim, {total} ta savol -> {dst}")


if __name__ == "__main__":
    main()
