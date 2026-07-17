import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API running on http://localhost:${env.PORT}  (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
