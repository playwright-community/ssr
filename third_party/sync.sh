#!/bin/bash

set -e
set +x

trap "cd $(pwd -P)" EXIT
cd "$(dirname "$0")"
SCRIPT_FOLDER="$(pwd -P)"

rm -rf interceptors
git clone https://github.com/playwright-community/msw-interceptors interceptors
cd interceptors
git checkout RemoteHttpInterceptor-fixes
npm i -g pnpm
pnpm install
OUT_DIR="$SCRIPT_FOLDER/../packages/playwright-ssr/third_party"
npx esbuild src/RemoteHttpInterceptorWS.ts  --platform=node --bundle --outfile=$OUT_DIR/interceptors.js --sourcemap --format=cjs
cp LICENSE.md $OUT_DIR/interceptors.LICENSE.md
rm -rf .git # In order to avoid git submodules
