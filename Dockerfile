FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -s /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci
COPY angular.json tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build
FROM nginx:alpine
ENV CONTROL_UPSTREAM=http://control-api:7020
ENV NGINX_ENVSUBST_FILTER=^CONTROL_UPSTREAM$
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/subscriptions/browser /usr/share/nginx/html
EXPOSE 80
