#!/bin/bash

set -e
set +x

trap "cd $(pwd -P)" EXIT
cd "$(dirname "$0")"

git clone https://github.com/playwright-community/msw-interceptors interceptors
cd interceptors
git checkout RemoteHttpInterceptor-fixes
npm i -g pnpm
pnpm install
npm run build
