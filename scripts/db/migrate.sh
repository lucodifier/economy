#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../apps/api"

echo "[db] Prisma generate"
npm run prisma:generate

echo "[db] Prisma migrate deploy"
npm run prisma:migrate:deploy

echo "[db] Done"
