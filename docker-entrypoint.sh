#!/bin/sh
set -e

echo "📦 Emitting Prisma contract..."
bun prisma contract emit || true

if [ "$AUTO_MIGRATE" = "true" ] || [ -n "$DATABASE_URL" ]; then
  echo "🔄 Ensuring database schema is synced..."
  bun prisma db init --yes 2>/dev/null || true
fi

echo "🚀 Starting services..."
exec "$@"
