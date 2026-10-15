#!/usr/bin/env bash
# Ottimizza le immagini del sito partendo dagli originali in alta qualita'
# (cartella old-images/, ignorata da git, stessa struttura di assets/).
#
#  - foto campi e pacchetti: max 1600px sul lato lungo, WebP q80
#  - logo: max 760px di larghezza (2x della dimensione massima mostrata), WebP con alpha
#
# Uso:  tools/optimize-images.sh
# Richiede: cwebp (brew install webp) e sips (macOS).
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="old-images/assets"
DST="assets"
MAX=1600
Q=80

[ -d "$SRC" ] || { echo "Manca $SRC (backup degli originali)"; exit 1; }

# Converte $1 in $2 (.webp) ridimensionando solo se il lato lungo supera $3
convert() {
  local in="$1" out="$2" max="$3" w h
  w=$(sips -g pixelWidth  "$in" | awk '/pixelWidth/  {print $2}')
  h=$(sips -g pixelHeight "$in" | awk '/pixelHeight/ {print $2}')
  mkdir -p "$(dirname "$out")"
  if [ "$w" -ge "$h" ] && [ "$w" -gt "$max" ]; then
    cwebp -quiet -q "$Q" -m 6 -mt -resize "$max" 0 "$in" -o "$out"
  elif [ "$h" -gt "$w" ] && [ "$h" -gt "$max" ]; then
    cwebp -quiet -q "$Q" -m 6 -mt -resize 0 "$max" "$in" -o "$out"
  else
    cwebp -quiet -q "$Q" -m 6 -mt "$in" -o "$out"
  fi
}

for f in "$SRC"/courses/*/*.jpg "$SRC"/packages/*/*/*.jpeg; do
  [ -e "$f" ] || continue
  rel="${f#"$SRC"/}"
  convert "$f" "$DST/${rel%.*}.webp" "$MAX"
done

# Logo (PNG con trasparenza)
if [ -e "$SRC/logo-transparent.png" ]; then
  cwebp -quiet -q 85 -m 6 -alpha_q 90 -resize 760 0 "$SRC/logo-transparent.png" -o "$DST/logo-transparent.webp"
fi

echo "Fatto."
