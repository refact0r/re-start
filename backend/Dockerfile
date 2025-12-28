FROM node:20-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --production && npm rebuild better-sqlite3

# Copy backend code
COPY . .

# Create db directory for SQLite
RUN mkdir -p /app/db

EXPOSE 3004

CMD ["node", "server.js"]
