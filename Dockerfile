# One image, two process roles (RUNTIME-PLATFORM §4.1): the command picks `web` or `worker`.
# Node runs the TypeScript sources directly (type stripping), as the tests do.

# Build stage: the browser client, built by the same `vite build` the browser suites run.
FROM node:26-slim AS client
RUN npm install --global pnpm@12.0.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps ./apps
COPY tools ./tools
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aiuteur/client exec vite build --outDir /client-dist --emptyOutDir --logLevel error

FROM node:26-slim
ENV NODE_ENV=production
# `media` probes every upload with ffprobe, and the fake provider's media checks run ffmpeg (packages/media, packages/testing).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.0.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps ./apps
COPY tools ./tools
RUN pnpm install --frozen-lockfile --prod
COPY --from=client /client-dist ./client-dist
USER node
EXPOSE 8080
CMD ["node", "packages/platform/scripts/web.ts"]
