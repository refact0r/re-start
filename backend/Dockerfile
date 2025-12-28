FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --production

# Copy backend code
COPY . .

# Create db directory for SQLite
RUN mkdir -p /app/db

# Frontend files will be copied to /app/public by the deploy workflow

EXPOSE 3004

CMD ["node", "server.js"]
