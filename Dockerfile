# One image, two process roles (RUNTIME-PLATFORM §4.1): the command picks `web` or `worker`.
# Node runs the TypeScript sources directly (type stripping), as the tests do.
FROM node:26-slim
ENV NODE_ENV=production
RUN npm install --global pnpm@12.0.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY tools ./tools
RUN pnpm install --frozen-lockfile --prod
USER node
EXPOSE 8080
CMD ["node", "packages/platform/scripts/web.ts"]
