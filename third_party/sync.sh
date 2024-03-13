#!/bin/bash

set -e
set +x

trap "cd $(pwd -P)" EXIT
cd "$(dirname "$0")"

rm -rf interceptors
git clone https://github.com/playwright-community/msw-interceptors interceptors
cd interceptors
git checkout RemoteHttpInterceptor-fixes
npm i -g pnpm
pnpm install
npm run build
rm -rf .git # In order to avoid git submodules
