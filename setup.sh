#!/bin/sh
set -e

cd "$(dirname "$0")"

for example in *.example data/*.example; do
  [ -e "$example" ] || continue
  target="${example%.example}"
  if [ -e "$target" ]; then
    echo "skip: $target already exists"
  else
    cp "$example" "$target"
    echo "created: $target"
  fi
done

# Generate langs.js from the data files present (data/<lang>.js)
langs=""
for f in data/*.js; do
  [ -e "$f" ] || continue
  lang="${f#data/}"
  lang="${lang%.js}"
  if [ -z "$langs" ]; then langs="\"$lang\""; else langs="$langs, \"$lang\""; fi
done
if [ -z "$langs" ]; then
  # Without a data file the page loads no events and, because `title` is never
  # defined, shows "[object HTMLDivElement]" instead of failing outright. Say so.
  langs="\"en\""
  echo "warning: data/ has no <lang>.js file — add one (e.g. data/en.js) or the page loads empty" >&2
fi
printf 'var langs = [%s];\n' "$langs" > langs.js
echo "generated: langs.js [$langs]"
