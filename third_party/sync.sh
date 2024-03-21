#!/bin/bash

set -e
set +x

trap "cd $(pwd -P)" EXIT
cd "$(dirname "$0")"
SCRIPT_FOLDER="$(pwd -P)"

USAGE=$(cat<<EOF
  usage: $(basename "$0") [--rebuild]

  --rebuild: Rebuild the interceptors package without syncing the source code.
EOF
)

if [[ $1 == "--help" || $1 == "-h" ]]; then
  echo "$USAGE"
  exit 0
fi

args=("$@")
IS_REBUILD=""
for ((i="${#args[@]}"-1; i >= 0; --i)); do
    case ${args[i]} in
        --rebuild) IS_REBUILD="1"; unset args[i]; ;;
    esac
done

if [[ $IS_REBUILD == "" ]]; then
    echo "Syncing the interceptors package..."
    rm -rf interceptors
    git clone https://github.com/playwright-community/msw-interceptors interceptors
    cd interceptors
    git checkout RemoteHttpInterceptor-fixes
    npm i -g pnpm
else
    echo "Rebuilding the interceptors package..."
    cd interceptors
fi
pnpm install
OUT_DIR="$SCRIPT_FOLDER/../packages/playwright-ssr/third_party"
npx esbuild src/RemoteHttpInterceptorWS.ts  --platform=node --bundle --outfile=$OUT_DIR/interceptors.js --sourcemap --format=cjs
cp LICENSE.md $OUT_DIR/interceptors.LICENSE.md
rm -rf .git # In order to avoid git submodules
