#!/bin/bash
set -e

ENV="$1"

if [ -z "$ENV" ]; then
  echo "Usage: ./scripts/deploy/deploy.sh <theeagles>"
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
    echo "ERROR: Unknown environment '$ENV'. Use: theeagles"
    exit 1
    ;;
esac

SMTOOL_ENV="${XDG_CONFIG_HOME:-$HOME/.config}/smtool/env"
if [ -z "$AWS_PROFILE" ] && [ -f "$SMTOOL_ENV" ]; then
  # shellcheck disable=SC1090
  source "$SMTOOL_ENV"
fi

echo "Checking AWS connectivity..."
if ! aws s3 ls "$CHECK_BUCKET" >/dev/null; then
  echo "ERROR: Cannot access S3. Run: smtool use smt"
  exit 1
fi

echo "Building for $ENV..."
$BUILD_CMD

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")

for TARGET in "${TARGETS[@]}"; do
  BACKUP="${TARGET%/*}/${TARGET##*/}-$TIMESTAMP"
  if aws s3 ls "$TARGET/" 2>/dev/null | grep -q .; then
    echo "Backing up $TARGET -> $BACKUP"
    aws s3 cp "$TARGET" "$BACKUP" --recursive
  else
    echo "No existing files at $TARGET, skipping backup"
  fi

  echo "Deploying to $TARGET"
  # Only the webpack bundle.*.js files are content-hashed; index.html,
  # config.json/config.example.json and smt-base-bridge.min.js keep the same
  # name across deploys, so they must be revalidated on every load or a
  # browser that already cached them never picks up a new deploy.
  aws s3 cp dist/ "$TARGET" --recursive \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" --exclude "config.json" --exclude "config.example.json" \
    --exclude "smt-base-bridge.min.js" --exclude "smt-base-bridge.min.js.map"
  aws s3 cp dist/ "$TARGET" --recursive \
    --cache-control "no-cache" \
    --exclude "*" --include "*.html" --include "config.json" --include "config.example.json" \
    --include "smt-base-bridge.min.js" --include "smt-base-bridge.min.js.map"
done

if [ -n "$CF_DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront distribution $CF_DISTRIBUTION_ID: ${CF_INVALIDATION_PATHS[*]}"
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DISTRIBUTION_ID" \
    --paths "${CF_INVALIDATION_PATHS[@]}"
fi

echo "$ENV deployment complete."
