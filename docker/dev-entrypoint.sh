#!/bin/sh

set -e

echo "Waiting for database to be ready..."
# Wait for PostgreSQL using basic shell loop (no extra dependencies)
until echo "SELECT 1" | yarn prisma db execute --stdin 2>/dev/null; do
  echo "Database not ready yet, retrying in 2s..."
  sleep 2
done

echo "Running database migrations..."
yarn prisma migrate deploy

echo "Starting development server..."
exec "$@"
