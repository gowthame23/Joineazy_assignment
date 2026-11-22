# Stage 1: Build Frontend SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
