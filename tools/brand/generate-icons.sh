#!/usr/bin/env bash
#
# Regenerates every favicon, touch icon and manifest icon from tools/brand/icon.html.
#
#   ./tools/brand/generate-icons.sh
#
# Rasterising is done by headless Google Chrome. That is deliberate: this repo has no image tooling
# (no sharp, no ImageMagick, no rsvg), and adding a native build dependency to package.json for an
# asset regenerated once a year is a poor trade. Chrome is already a hard requirement for anyone
# deploying this stack, since CLAUDE.md requires every deploy touching the dashboard to end by
# loading it in a real browser.
#
# `npm install` must have run: icon.html loads Inter from node_modules/@fontsource/inter, which is
# the typeface the console itself self-hosts. Rendering without it silently substitutes whatever
# Chrome falls back to, and the wordmark in the icon then matches nothing in the product.
#
# ONE SOURCE, AND EVERY OUTPUT IS WIRED. hc-patient's equivalent emits 28 filenames including
# android-icon-*, ms-icon-*, manifest.json and browserconfig.xml; its own commit notes record that
# nothing links those and that the root-level copies never reach a build. They are not copied here.
# Every file this script writes is referenced by index.html or manifest.webapp, and
# src/main/webapp/branding.spec.ts fails if that stops being true.
#
# The .ico is written by hand below because no icon tooling is available either. It embeds PNGs,
# which every current browser and Windows Vista+ understand.
#
# NOT GENERATED: content/images/logo-mark.svg. That is the text-free small mark used by the pre-boot
# spinner at 14px and is hand-maintained — see the note in the file itself.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root (app/)
HERE="tools/brand"
WEB="src/main/webapp"
IMG="$WEB/content/images"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

CHROME="${CHROME:-google-chrome}"
command -v "$CHROME" >/dev/null || {
  echo "need $CHROME on PATH (or set CHROME=)"
  exit 1
}
[[ -f node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2 ]] || {
  echo "run npm install first — icon.html renders the wordmark in Inter from node_modules"
  exit 1
}

render() { # size, destination
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 \
    --screenshot="$2" --window-size="$1,$1" "file://$PWD/$HERE/icon.html" >/dev/null 2>&1
}

echo "rendering..."
# 48 exists only to be embedded in the .ico; it is never written out on its own.
for s in 16 32 48 180 192 256 384 512; do
  render "$s" "$OUT/icon-$s.png"
done

echo "building favicon.ico (16/32/48)..."
python3 - "$OUT" <<'PY'
import struct, sys, os
out = sys.argv[1]
imgs = [(s, open(os.path.join(out, f'icon-{s}.png'), 'rb').read()) for s in (16, 32, 48)]
header = struct.pack('<HHH', 0, 1, len(imgs))
offset = 6 + 16 * len(imgs)
entries = b''
for s, data in imgs:
    entries += struct.pack('<BBBBHHII', s, s, 0, 0, 1, 32, len(data), offset)
    offset += len(data)
open(os.path.join(out, 'favicon.ico'), 'wb').write(header + entries + b''.join(d for _, d in imgs))
PY

echo "installing..."
# favicon.ico is the one icon that lives at the webapp root, because angular.json's assets list
# names it there explicitly. Every other icon goes under content/images/ — see index.html.
cp "$OUT/favicon.ico" "$WEB/favicon.ico"
for s in 16 32; do cp "$OUT/icon-$s.png" "$IMG/favicon-${s}x${s}.png"; done
cp "$OUT/icon-180.png" "$IMG/apple-icon-180x180.png"
for s in 192 256 384 512; do cp "$OUT/icon-$s.png" "$IMG/icon-${s}x${s}.png"; done

echo "done. $(git status --short -- "$WEB" | wc -l) file(s) changed."
