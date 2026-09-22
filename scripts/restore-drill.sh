#!/usr/bin/env bash
# Proves the offsite backup is real: takes the newest dump out of the Scaleway
# bucket, restores it into a throwaway Postgres, and counts what came back.
#
#   ./scripts/restore-drill.sh                  # newest dump straight from the bucket
#   ./scripts/restore-drill.sh ~/Downloads/x.dmp  # a dump already on this Mac
#   ./scripts/restore-drill.sh --keep [file]    # leave the restored database running
#
# A backup nobody has restored is a hope, not a backup (docs/ROADMAP.md, A1).
# pg_dump can write a file that looks perfectly healthy and will not restore:
# the wrong format flag, a truncated upload, the wrong database. The only way
# to know is to read it back.
#
# Nothing here touches production. It reads the bucket and writes to a
# container named below, which it removes on the way in and out.
#
# Credentials come from ~/.scaleway-backup (never passed on the command line,
# where they would land in the shell history):
#   SCW_ACCESS_KEY=...
#   SCW_SECRET_KEY=...
#   SCW_BUCKET=lahga-db-backups
#   SCW_REGION=fr-par
set -euo pipefail

CREDS=~/.scaleway-backup
CONTAINER=lahga-restore-drill
PORT=55433
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

KEEP=no
LOCAL_DUMP=
for arg in "$@"; do
  case "$arg" in
    --keep) KEEP=yes ;;
    *) LOCAL_DUMP=$arg ;;
  esac
done

if [ -n "$LOCAL_DUMP" ]; then
  # A dump downloaded by hand from the Scaleway console is the same object the
  # bucket holds, so the drill is just as good — and it needs no credentials.
  [ -f "$LOCAL_DUMP" ] || { echo "No such file: $LOCAL_DUMP"; exit 1; }
  echo "==> Using local dump: $LOCAL_DUMP"
  cp "$LOCAL_DUMP" "$WORK/dump"
else
  [ -f "$CREDS" ] || { echo "Missing $CREDS — or pass a dump file. See the header of this script."; exit 1; }
  # shellcheck disable=SC1090
  set -a; . "$CREDS"; set +a
  : "${SCW_ACCESS_KEY:?}" "${SCW_SECRET_KEY:?}" "${SCW_BUCKET:?}"
  REGION=${SCW_REGION:-fr-par}
  HOST="s3.${REGION}.scw.cloud"

  # curl signs the request itself (--aws-sigv4), so this needs no AWS CLI.
  s3() { curl -sS --fail-with-body --max-time 120 \
    --aws-sigv4 "aws:amz:${REGION}:s3" --user "${SCW_ACCESS_KEY}:${SCW_SECRET_KEY}" "$@"; }

  echo "==> Listing s3://${SCW_BUCKET} (${REGION})"
  s3 "https://${HOST}/${SCW_BUCKET}?list-type=2" > "$WORK/list.xml"

  python3 - "$WORK/list.xml" > "$WORK/newest" <<'PY'
import sys, re, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
ns = {'s3': re.match(r'\{(.*)\}', root.tag).group(1)} if root.tag.startswith('{') else {}
q = lambda t: f"{{{ns['s3']}}}{t}" if ns else t
items = [(c.find(q('Key')).text, int(c.find(q('Size')).text), c.find(q('LastModified')).text)
         for c in root.findall(q('Contents'))]
if not items:
    print("EMPTY", file=sys.stderr); raise SystemExit(1)
for k, s, m in sorted(items, key=lambda i: i[2])[-5:]:
    print(f"    {m}  {s:>10,} bytes  {k}", file=sys.stderr)
newest = max(items, key=lambda i: i[2])
print(newest[0])
PY

  KEY=$(cat "$WORK/newest")
  echo "==> Newest object: $KEY"
  echo "==> Downloading"
  s3 -o "$WORK/dump" "https://${HOST}/${SCW_BUCKET}/${KEY}"
fi

SIZE=$(wc -c < "$WORK/dump" | tr -d ' ')
echo "    ${SIZE} bytes on disk"
[ "$SIZE" -gt 1000 ] || { echo "    that is too small to be a dump"; exit 1; }

# A custom-format dump starts with the literal PGDMP and needs pg_restore;
# a plain-SQL dump is fed to psql instead.
if head -c 5 "$WORK/dump" | grep -q PGDMP; then FORMAT=custom; else FORMAT=plain; fi
echo "    format: $FORMAT"

echo "==> Starting a throwaway Postgres 17 on port ${PORT}"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=drill \
  -p "${PORT}:5432" postgres:17 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1
done
docker exec "$CONTAINER" psql -U postgres -qc 'create database lahga' >/dev/null

echo "==> Restoring"
docker cp "$WORK/dump" "$CONTAINER:/tmp/dump" >/dev/null
if [ "$FORMAT" = custom ]; then
  docker exec "$CONTAINER" pg_restore -U postgres -d lahga --no-owner --no-acl /tmp/dump
else
  docker exec "$CONTAINER" psql -U postgres -d lahga -q -f /tmp/dump
fi

echo "==> What came back"
docker exec "$CONTAINER" psql -U postgres -d lahga -At -F'  ' -c "
  select 'words',    count(*) from words    where status = 'active'
  union all select 'entries',  count(*) from entries  where status = 'active'
  union all select 'examples', count(*) from examples
  union all select 'dialects', count(*) from dialects
  union all select 'users',    count(*) from users
  union all select 'revisions',count(*) from revisions
  order by 1" | sed 's/^/    /'

echo
echo "==> Compare against the live site"
LIVE=$(curl -s --max-time 20 https://lahga.fyi/sitemap.xml | grep -c '<loc>' || echo '?')
echo "    live sitemap URLs: ${LIVE}"

if [ "$KEEP" = yes ]; then
  echo
  echo "Left running. Point the site at it with:"
  echo "  DATABASE_URL=postgres://postgres:drill@127.0.0.1:${PORT}/lahga npm run dev"
  echo "Remove it later with: docker rm -f ${CONTAINER}"
else
  docker rm -f "$CONTAINER" >/dev/null
  echo "    (throwaway database removed; pass --keep to run the site against it)"
fi

echo
echo "Restore drill passed: the offsite dump reads back into a working database."
