# Stage 1: Build Vite React assets
FROM node:20.17.0-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_GA_TRACKING_ID
ENV VITE_GA_TRACKING_ID=${VITE_GA_TRACKING_ID}
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27.2-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
