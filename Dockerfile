FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime-dependencies

WORKDIR /app/.output/server
COPY --from=build /app/.output/server/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=runtime-dependencies --chown=node:node /app/.output/server/node_modules ./.output/server/node_modules

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
