#!/usr/bin/env bash
# =====================================================================
# Rigenera i font self-hosted (subset ai soli caratteri usati sul sito).
# Da lanciare quando aggiungi/modifichi testo cinese in data/*.json.
#
# Requisiti: node + npm, python3, e i pacchetti python "fonttools" e "brotli".
#   pip install fonttools brotli
#
# Uso:  bash tools/regenerate-fonts.sh   (dalla cartella principale del sito)
# =====================================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/fonts"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

echo "→ Scarico i font sorgente (Fontsource) in una cartella temporanea…"
cd "$TMP"
npm init -y >/dev/null 2>&1
npm install @fontsource/cormorant-garamond @fontsource/noto-sans-sc @fontsource/noto-serif-sc >/dev/null 2>&1
SRC="$TMP/node_modules/@fontsource"

echo "→ Costruisco il set di caratteri usati (IT + ZH + contenuti)…"
python3 - "$ROOT" <<'PY'
import sys, json
root=sys.argv[1]; chars=set()
for c in range(0x20,0x7f): chars.add(chr(c))
for c in range(0xa0,0x100): chars.add(chr(c))
chars |= set("–—…‘’“”•·«»€°→←↑↓，。、；：！？（）【】《》「」『』〈〉％＆")
def walk(o):
    if isinstance(o,str): chars.update(o)
    elif isinstance(o,dict):
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
for f in [f"{root}/data/it.json", f"{root}/data/zh.json", f"{root}/data/golf-courses.json"]:
    walk(json.load(open(f)))
open("/tmp/_charset.txt","w").write("".join(sorted(c for c in chars if ord(c)>=0x20)))
print("  caratteri:", len(chars))
PY

echo "→ Subset dei font → $OUT"
sub(){ pyftsubset "$1" --text-file=/tmp/_charset.txt --flavor=woff2 --output-file="$2" --layout-features='*' --no-hinting; }
sub "$SRC/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2" "$OUT/cormorant-400.woff2"
sub "$SRC/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2" "$OUT/cormorant-600.woff2"
sub "$SRC/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2" "$OUT/cormorant-700.woff2"
for w in 300 400 500 700; do sub "$SRC/noto-sans-sc/files/noto-sans-sc-chinese-simplified-$w-normal.woff2" "$OUT/notosans-sc-$w.woff2"; done
for w in 400 600 700; do sub "$SRC/noto-serif-sc/files/noto-serif-sc-chinese-simplified-$w-normal.woff2" "$OUT/notoserif-sc-$w.woff2"; done

rm -rf "$TMP"
echo "✓ Fatto. Font aggiornati in assets/fonts/"
