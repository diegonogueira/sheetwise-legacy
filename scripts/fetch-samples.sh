#!/usr/bin/env bash
# Baixa os samples do piano para public/samples/, de onde o app os carrega — no navegador e,
# empacotados pelo Capacitor, no Android SEM internet.
#
#   ./scripts/fetch-samples.sh        (ou npm run samples)
#
# Os arquivos são bundles MIDI.js base64 do repositório gleitz/midi-js-soundfonts
# (MusyngKite, Creative Commons — ver public/samples/CREDITS.txt). VÃO PARA O GIT de
# propósito: assim o build do Docker e o do Gradle não dependem de rede, e o app não quebra
# se o CDN sumir.
set -euo pipefail

cd "$(dirname "$0")/.."
KIT=MusyngKite
BASE=https://gleitz.github.io/midi-js-soundfonts/$KIT
OUT=public/samples/sf/$KIT
mkdir -p "$OUT"

# instrumento-formato — ogg toca em todo lugar menos no Safari, que usa mp3
FILES="acoustic_grand_piano-ogg acoustic_grand_piano-mp3"

for f in $FILES; do
  dest="$OUT/$f.js"
  if [ -s "$dest" ]; then
    echo "· $f.js já está aqui ($(du -h "$dest" | cut -f1))"
    continue
  fi
  echo "→ baixando $f.js…"
  curl -fL --retry 3 --progress-bar "$BASE/$f.js" -o "$dest.part"
  mv "$dest.part" "$dest"
  echo "  ✓ $(du -h "$dest" | cut -f1)"
done

echo
echo "✓ samples em $OUT"
du -sh "$OUT"
