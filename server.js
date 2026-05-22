import app from './src/app.js';
import connectDB from './src/db/db.js';
import { connectRabbitMQ } from './src/broker/rabbit.js';

async function startServer() {
  await connectDB();
  await connectRabbitMQ();



// Start the server on port 3000

  app.listen(3000, () => {
    console.log('Auth Service Running on Port 3000 🩵');
  });
}

startServer().catch((error) => {
  console.error('Failed to start Auth service:', error);
  process.exit(1);
});