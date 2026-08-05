#!/bin/sh
set -e

cd "$(dirname "$0")"

for example in *.example; do
  [ -e "$example" ] || continue
  target="${example%.example}"
  if [ -e "$target" ]; then
    echo "skip: $target already exists"
  else
    cp "$example" "$target"
    echo "created: $target"
  fi
done

# Generate langs.js from the data files present (data.js = en, data.<lang>.js = <lang>)
langs="\"en\""
for f in data.*.js; do
  [ -e "$f" ] || continue
  lang="${f#data.}"
  lang="${lang%.js}"
  langs="$langs, \"$lang\""
done
printf 'var langs = [%s];\n' "$langs" > langs.js
echo "generated: langs.js [$langs]"
