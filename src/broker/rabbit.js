import amqp from 'amqplib';
import config from '../config/config.js';

let channel, connection;

// Here we are creating a connection to RabbitMQ.
export async function connectRabbitMQ() {
  try {
    const rabbitHost = config.RABITMQ_URI ? config.RABITMQ_URI.split('@')[1] || config.RABITMQ_URI : 'unknown';
    console.log(`Connecting to RabbitMQ at: ${rabbitHost.split('/')[0]}`);
    
    connection = await amqp.connect(config.RABITMQ_URI);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ 🐰');
  } catch (error) {
    console.warn(`⚠️ Failed to connect to RabbitMQ: ${error.message}. Running in offline mode without message broker.`);
    connection = null;
    channel = null;
  }
}

// This function is used to publish messages to a specific queue in RabbitMQ.
export async function publishToQueue(queueName, data) {
  if (!channel) {
    console.warn(`⚠️ [Offline Mode] RabbitMQ not connected. Skipping event publish to "${queueName}":`, JSON.stringify(data));
    return;
  }
  try {
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
    console.log(`Message sent to queue ${queueName} : ${JSON.stringify(data)}`);
  } catch (err) {
    console.error(`❌ Failed to publish message to queue ${queueName}:`, err.message);
  }
}