# Production backend container
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.base.json tsconfig.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm run build:backend

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist/backend ./dist/backend
COPY --from=build /app/shared ./shared
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/backend/backend/src/server.js"]

