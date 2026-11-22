FROM node:22-alpine

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src ./src

# Run as non-root user for security
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
