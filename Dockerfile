# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN NODE_ENV=development npm install
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
ENV AANEWS_PORT=3000
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
