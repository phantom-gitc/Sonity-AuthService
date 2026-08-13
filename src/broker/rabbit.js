import amqp from 'amqplib';
import config from '../config/config.js';

let channel, connection;

// Here we are creating a connection to RabbitMQ.
export async function connectRabbitMQ() {
  try {
    const rabbitUri = config.RABBITMQ_URI || config.RABITMQ_URI;
    const rabbitHost = rabbitUri ? rabbitUri.split('@')[1] || rabbitUri : 'unknown';
    console.log(`Connecting to RabbitMQ at: ${rabbitHost.split('/')[0]}`);
    
    connection = await amqp.connect(rabbitUri);

    connection.on('error', (err) => {
      console.warn('⚠️ RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      console.warn('⚠️ RabbitMQ connection dropped. Reconnecting in 5s...');
      connection = null;
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ 🐰');
  } catch (error) {
    console.warn(`⚠️ Failed to connect to RabbitMQ: ${error.message}. Retrying in 5s...`);
    connection = null;
    channel = null;
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    // Ignore shutdown errors
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
