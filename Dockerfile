FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile || bun install

COPY prisma.config.ts tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs components.json ./
COPY src ./src
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY server ./server
COPY scripts ./scripts
COPY migrations ./migrations

RUN bun prisma contract emit || true
ENV NEXT_TELEMETRY_DISABLED=1
ENV JWT_SECRET="build_time_placeholder_secret_key_minimum_32_characters!"
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV REDIS_URL="redis://localhost:6379"
RUN npx next build

FROM oven/bun:1-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV WS_PORT=3001

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/migrations ./migrations

COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p /app/uploads/media && chmod -R 777 /app/uploads

EXPOSE 3000
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health 2>/dev/null || curl -f http://localhost:3000 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "scripts/prod.ts"]
