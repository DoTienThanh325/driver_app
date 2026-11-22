FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ARG EXPO_PUBLIC_NOTIFICATION_WS_URL
ENV EXPO_PUBLIC_NOTIFICATION_WS_URL=${EXPO_PUBLIC_NOTIFICATION_WS_URL}
ENV EXPO_NO_TELEMETRY=1
ENV MOBILE_DOCKER_WEB=1
RUN ./node_modules/.bin/expo export --platform web

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
