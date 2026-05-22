import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file

dotenvConfig();

// Configuration object to hold all the configuration variables

const _config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  RABITMQ_URI: process.env.RABITMQ_URI,
};

export default _config;
