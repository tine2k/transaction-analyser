#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./paypal-spike.sh api 2026-09-20T00:00:00+02:00 2026-09-27T23:59:59+02:00
#   ./paypal-spike.sh csv ~/Downloads/Activity.csv
#
# Requires: curl, jq, and PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.
# Optional: PAYPAL_API_BASE (defaults to live; use
# https://api-m.sandbox.paypal.com for sandbox).

if [[ "${1:-}" == "csv" ]]; then
  csv="${2:?usage: $0 csv <file.csv>}"
  python3 - "$csv" <<'PY'
import csv, sys
with open(sys.argv[1], newline='', encoding='utf-8-sig') as handle:
    reader = csv.DictReader(handle)
    print('columns:', ', '.join(reader.fieldnames or []))
    wanted = ['Date', 'Time', 'TimeZone', 'Name', 'Type', 'Status',
              'Currency', 'Gross', 'Fee', 'Net', 'Transaction ID']
    for index, row in enumerate(reader):
        if index >= 10:
            break
        print(index + 1, {key: row.get(key, '') for key in wanted})
PY
  exit 0
fi

if [[ "${1:-}" != "api" ]]; then
  echo "usage: $0 api <from-iso8601> <to-iso8601> [out.json]" >&2
  echo "       $0 csv <file.csv>" >&2
  exit 1
fi

: "${PAYPAL_CLIENT_ID:?set PAYPAL_CLIENT_ID}"
: "${PAYPAL_CLIENT_SECRET:?set PAYPAL_CLIENT_SECRET}"

from="${2:?missing from date}"
to="${3:?missing to date}"
out="${4:-paypal-transactions.json}"
base="${PAYPAL_API_BASE:-https://api-m.paypal.com}"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

echo "Requesting token from $base ..."
token_response="$(curl -sS -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -H 'Accept: application/json' \
  -H 'Accept-Language: en_US' \
  -d 'grant_type=client_credentials' \
  "$base/v1/oauth2/token")"

token="$(printf '%s' "$token_response" | jq -r '.access_token // empty')"
if [[ -z "$token" ]]; then
  echo "No access token. PayPal answered:" >&2
  printf '%s\n' "$token_response" >&2
  exit 1
fi

echo "Fetching transactions $from .. $to ..."
http="$(curl -sS -G "$base/v1/reporting/transactions" \
  -H "Authorization: Bearer $token" \
  -H 'Accept: application/json' \
  --data-urlencode "start_date=$from" \
  --data-urlencode "end_date=$to" \
  --data-urlencode 'fields=all' \
  --data-urlencode 'page_size=100' \
  -o "$out" \
  -w '%{http_code}')"

if [[ "$http" != "200" ]]; then
  echo "HTTP $http" >&2
  cat "$out" >&2
  exit 1
fi

echo "Saved $out"
pages="$(jq -r '.total_pages // 1' "$out")"
items="$(jq -r '.total_items // 0' "$out")"
echo "items: $items  pages: $pages"
if [[ "$pages" -gt 1 ]]; then
  echo "Note: only page 1 was saved. Narrow the window or add paging." >&2
fi

printf 'date\tamount\tcurrency\tstatus\ttransaction_id\tsubject\tpayer\titems\n'
jq -r '
  (.transaction_details // [])[] |
  [
    (.transaction_info.transaction_initiation_date // ""),
    (.transaction_info.transaction_amount.value // ""),
    (.transaction_info.transaction_amount.currency_code // ""),
    (.transaction_info.transaction_status // ""),
    (.transaction_info.transaction_id // ""),
    (.transaction_info.transaction_subject // ""),
    (.payer_info.payer_name.alternate_full_name // .payer_info.payer_name.full_name // ""),
    ([.cart_info.item_details[]?.item_name] | join(" | "))
  ] | @tsv
' "$out"
