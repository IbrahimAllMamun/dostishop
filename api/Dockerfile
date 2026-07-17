# Simple, correct build. (Dev runs on the host with hot-reload; this image is for
# container/prod parity and cloud deploy.)
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000

# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
