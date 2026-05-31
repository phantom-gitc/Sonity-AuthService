import app from './src/app.js';
import connectDB from './src/db/db.js';
import mongoose from 'mongoose';
import config from './src/config/config.js';
import { closeRabbitMQ, connectRabbitMQ } from './src/broker/rabbit.js';

let server;

async function startServer() {
  await connectDB();
  await connectRabbitMQ();



// Start the server on port 3000

  server = app.listen(config.PORT, () => {
    console.log(`Auth Service Running on Port ${config.PORT} 🩵`);
  });
}

// Gracefully closes network and database connections during deploy restarts.
async function shutdown(signal) {
  console.log(`${signal} received. Shutting down Auth service...`);
  if (server) server.close();
  await closeRabbitMQ().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('Failed to start Auth service:', error);
  process.exit(1);
});
