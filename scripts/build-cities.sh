#!/usr/bin/env bash
# Build data/cities.tsv from GeoNames raw dumps.
#
# Inputs (data/raw/, gitignored):
#   cities15000.txt        — pop > 15k worldwide (TSV, no header)
#   countryInfo.txt        — ISO-2 → country name (TSV, # comments)
#   admin1CodesASCII.txt   — {cc}.{code} → admin1 name (TSV, no header)
#
# Output (data/cities.tsv, committed):
#   geonames_id  name  country  country_code  admin1  admin1_code
#   lat  lon  population  timezone  iata  booking_dest_id
#
# Re-run when GeoNames refreshes. Tweak MIN_POP to grow/shrink the list.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/data/raw"
OUT="$ROOT/data/cities.tsv"
MIN_POP="${MIN_POP:-100000}"

for f in cities15000.txt countryInfo.txt admin1CodesASCII.txt; do
  [[ -f "$RAW/$f" ]] || { echo "Missing: $RAW/$f" >&2; exit 1; }
done

echo "Building $OUT (pop > $MIN_POP)..."

awk -v min_pop="$MIN_POP" '
  BEGIN { FS = OFS = "\t" }

  # Pass 1: countryInfo.txt — ISO-2 → country name
  FILENAME ~ /countryInfo\.txt$/ {
    if ($0 ~ /^#/ || $0 == "") next
    country[$1] = $5
    next
  }

  # Pass 2: admin1CodesASCII.txt — "{cc}.{code}" → admin1 name
  FILENAME ~ /admin1CodesASCII\.txt$/ {
    admin1[$1] = $2
    next
  }

  # Pass 3: cities15000.txt — emit rows above threshold
  FILENAME ~ /cities15000\.txt$/ {
    pop = $15 + 0
    if (pop < min_pop) next

    cc = $9
    a1code = $11
    a1key = cc "." a1code
    a1name = (a1code != "" && a1key in admin1) ? admin1[a1key] : ""
    cname = (cc in country) ? country[cc] : cc

    # Round lat/lon to 4dp (matches router precision)
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%.4f\t%.4f\t%d\t%s\t\t\n", \
      $1, $2, cname, cc, a1name, a1code, $5, $6, pop, $18
  }
' "$RAW/countryInfo.txt" "$RAW/admin1CodesASCII.txt" "$RAW/cities15000.txt" \
  | sort -t $'\t' -k9,9nr \
  | awk -F'\t' '!seen[tolower($3"|"$5"|"$2)]++' \
  > "$OUT.tmp"

# Prepend header
{
  printf "geonames_id\tname\tcountry\tcountry_code\tadmin1\tadmin1_code\tlat\tlon\tpopulation\ttimezone\tiata\tbooking_dest_id\n"
  cat "$OUT.tmp"
} > "$OUT"
rm "$OUT.tmp"

count=$(($(wc -l < "$OUT") - 1))
size=$(du -h "$OUT" | cut -f1)
echo "Wrote $count cities to $OUT ($size)"
