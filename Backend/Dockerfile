# Stage 1: Builder
FROM node:18 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (fix old/deprecated packages)
RUN npm install --legacy-peer-deps

# Copy app code
COPY . .

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copy only the needed built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["npm", "start"]
