# Multi-stage frontend container
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.base.json tsconfig.node.json tsconfig.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build:frontend

FROM nginx:1.25-alpine
COPY --from=build /app/dist/frontend /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

