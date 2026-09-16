#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

ENV=""
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run|--dryrun) DRY_RUN=1 ;;
    -*) echo "ERROR: Unknown option '$arg'" >&2; exit 1 ;;
    *)
      if [ -n "$ENV" ]; then echo "ERROR: Unexpected argument '$arg'" >&2; exit 1; fi
      ENV="$arg"
      ;;
  esac
done

if [ -z "$ENV" ]; then
  cat >&2 <<'USAGE'
Usage: ./scripts/deploy/deploy.sh <theeagles> [--dry-run]

Deploys this viewer app only. The embedded components are released on their
own cycle from their own checkout — deploy them with that repo's script.

  --dry-run   Build locally, then print every S3 change without making any.
              The build still runs: the preview is only meaningful when dist/
              holds the same artefacts a real deploy would upload.
USAGE
  exit 1
fi

case "$ENV" in
  theeagles)
    BUILD_CMD="yarn build"
    TARGETS=(
      "s3://embedded-live/theeagles"
    )
    CHECK_BUCKET="s3://embedded-live/"
    CF_DISTRIBUTION_ID="E3OOLR1ZG9PHEC"
    CF_INVALIDATION_PATHS=("/theeagles/*")
    ;;
  *)
    echo "ERROR: Unknown environment '$ENV'. Use: theeagles" >&2
    exit 1
    ;;
esac

# Only the webpack bundle.*.js files are content-hashed; index.html,
# config.json/config.example.json and smt-base-bridge.min.js keep the same name
# across deploys, so they must be revalidated on every load or a browser that
# already cached them never picks up a new deploy.
NO_CACHE_PATTERNS=(
  "*.html"
  "config.json"
  "config.example.json"
  "smt-base-bridge.min.js"
  "smt-base-bridge.min.js.map"
)

SMTOOL_ENV="${XDG_CONFIG_HOME:-$HOME/.config}/smtool/env"
if [ -z "$AWS_PROFILE" ] && [ -f "$SMTOOL_ENV" ]; then
  # shellcheck disable=SC1090
  source "$SMTOOL_ENV"
fi

DRYRUN_FLAG=()
if [ "$DRY_RUN" -eq 1 ]; then
  DRYRUN_FLAG=(--dryrun)
  echo "*** DRY RUN — no S3 object will be uploaded, overwritten or deleted. ***"
fi

echo "Checking AWS connectivity..."
if ! aws s3 ls "$CHECK_BUCKET" >/dev/null; then
  echo "ERROR: Cannot access S3. Run: smtool use smt" >&2
  exit 1
fi

# Build from scratch. The upload below uses --delete, so bundles left in dist/
# by an earlier build would otherwise be published alongside the current one,
# and a dist/ from a different branch could purge the live deploy and replace
# it with the wrong build. Removing dist/ first makes that impossible.
echo "Cleaning dist/..."
rm -rf dist

echo "Building for $ENV..."
$BUILD_CMD

if [ ! -d dist ] || [ -z "$(ls -A dist)" ]; then
  echo "ERROR: build produced no dist/ output — refusing to sync." >&2
  exit 1
fi

# --delete prunes objects this build no longer produces, so the deployed prefix
# ends up matching dist/ exactly instead of accumulating every past build. The
# filters below apply to the destination as well as the source, so each pass can
# only delete objects it would also have uploaded: pass 1 cannot touch the
# no-cache files, and pass 2 cannot touch the hashed bundles.
IMMUTABLE_FILTER=()
NO_CACHE_FILTER=(--exclude "*")
for pattern in "${NO_CACHE_PATTERNS[@]}"; do
  IMMUTABLE_FILTER+=(--exclude "$pattern")
  NO_CACHE_FILTER+=(--include "$pattern")
done

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")

for TARGET in "${TARGETS[@]}"; do
  BACKUP="${TARGET%/*}/${TARGET##*/}-$TIMESTAMP"
  if aws s3 ls "$TARGET/" 2>/dev/null | grep -q .; then
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "Would back up $TARGET -> $BACKUP"
    else
      echo "Backing up $TARGET -> $BACKUP"
      aws s3 cp "$TARGET" "$BACKUP" --recursive
    fi
  else
    echo "No existing files at $TARGET, skipping backup"
  fi

  echo "Deploying to $TARGET"
  aws s3 sync dist/ "$TARGET" --delete "${DRYRUN_FLAG[@]}" \
    --cache-control "public, max-age=31536000, immutable" \
    "${IMMUTABLE_FILTER[@]}"
  aws s3 sync dist/ "$TARGET" --delete "${DRYRUN_FLAG[@]}" \
    --cache-control "no-cache" \
    "${NO_CACHE_FILTER[@]}"
done

if [ -n "$CF_DISTRIBUTION_ID" ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would invalidate CloudFront $CF_DISTRIBUTION_ID: ${CF_INVALIDATION_PATHS[*]}"
  else
    echo "Invalidating CloudFront distribution $CF_DISTRIBUTION_ID: ${CF_INVALIDATION_PATHS[*]}"
    aws cloudfront create-invalidation \
      --distribution-id "$CF_DISTRIBUTION_ID" \
      --paths "${CF_INVALIDATION_PATHS[@]}"
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "$ENV dry run complete — nothing was changed."
else
  echo "$ENV deployment complete."
fi
