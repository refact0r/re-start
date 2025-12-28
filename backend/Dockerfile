FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Create db directory for SQLite
RUN mkdir -p /app/db

EXPOSE 3004

CMD ["node", "server.js"]
