import amqp from 'amqplib';
import config from '../config/config.js';


let channel , connection;


// Here we are creating a connection to RabbitMQ .

export async function connectRabbitMQ(){

    connection = await amqp.connect(config.RABITMQ_URI);

    channel = await connection.createChannel();

    console.log('Connected to RabbitMQ 🐰');
}


// This function is used to publish messages to a specific queue in RabbitMQ.

export async function publishToQueue(queueName , data){

    await channel.assertQueue(queueName , {durable : true});
    channel.sendToQueue(queueName , Buffer.from(JSON.stringify(data)));
    console.log(`Message sent to queue ${queueName} : ${JSON.stringify(data)}`);
}