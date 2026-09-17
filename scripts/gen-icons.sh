#!/usr/bin/env bash
# Gera os ícones do app Android a partir da arte vetorial em src/assets/brand/.
# Igual em todos os apps *wise (fonte: wisekit, templates/identicos/scripts/gen-icons.sh).
# Requer: rsvg-convert (librsvg) e ImageMagick 7 (magick).
#
#   ./scripts/gen-icons.sh
#
# Fontes da verdade:
#   src/assets/brand/icon.svg     o ladrilho inteiro (fundo Noite + arte) = o favicon
#   src/assets/brand/icon-fg.svg  só a arte, na grade 108 do ícone adaptativo (zona segura 66)
set -euo pipefail

cd "$(dirname "$0")/.."
RES=android/app/src/main/res
TILE=src/assets/brand/icon.svg
FG=src/assets/brand/icon-fg.svg
# o fundo do ícone adaptativo, do ladrilho e da splash: o índigo da paleta Noite, o mesmo em
# toda a família (o acento da interface continua o #6366f1)
BG="#1e1b4b"
# sem data dentro do PNG: rodar de novo sem mudar a arte não suja o git
NO_DATE="-define png:exclude-chunks=date,time"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# nome:tamanho do ícone legado (mipmap), do primeiro plano adaptativo (108dp) e da splash (288dp)
DENSITIES="mdpi:48:108:288 hdpi:72:162:432 xhdpi:96:216:576 xxhdpi:144:324:864 xxxhdpi:192:432:1152"

# o favicon é o próprio ladrilho
cp "$TILE" public/favicon.svg

rsvg-convert -w 512 -h 512 "$TILE" -o "$TMP/tile.png"

for d in $DENSITIES; do
  IFS=: read -r dir legacy fg splash <<<"$d"
  out=$RES/mipmap-$dir
  mkdir -p "$out"

  # adaptativo: o launcher aplica a máscara, então o primeiro plano vai inteiro
  rsvg-convert -w "$fg" -h "$fg" "$FG" -o "$out/ic_launcher_foreground.png"

  # splash (API 31+): ícone sem fundo num quadro de 288dp, recortado num círculo de 192dp — a
  # mesma proporção 2/3 do adaptativo (72 de 108), então é a mesma arte, em cada densidade
  mkdir -p "$RES/drawable-$dir"
  rsvg-convert -w "$splash" -h "$splash" "$FG" -o "$RES/drawable-$dir/splash_icon.png"

  # legado (Android < 8): a máscara tem de vir aplicada na arte
  radius=$((legacy * 22 / 100))
  magick "$TMP/tile.png" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -fill white \
       -draw "roundrectangle 0,0 $((legacy - 1)),$((legacy - 1)) $radius,$radius" \) \
    -alpha set -compose DstIn -composite $NO_DATE "$out/ic_launcher.png"
  magick "$TMP/tile.png" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -fill white \
       -draw "circle $((legacy / 2)),$((legacy / 2)) $((legacy / 2)),0" \) \
    -alpha set -compose DstIn -composite $NO_DATE "$out/ic_launcher_round.png"
done

cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$BG</color>
    <color name="splash_bg">$BG</color>
</resources>
XML

echo "✓ ícones e splash gerados em $RES (lembre do tema AppTheme.NoActionBarLaunch: guia/11-android.md)"
