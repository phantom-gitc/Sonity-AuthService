import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file

dotenvConfig();

// Configuration object to hold all the configuration variables

const _config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2d",
  COOKIE_MAX_AGE_MS: parseInt(process.env.COOKIE_MAX_AGE_MS, 10) || 2 * 24 * 60 * 60 * 1000,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RABBITMQ_URI: process.env.RABBITMQ_URI || process.env.RABITMQ_URI,
  RABITMQ_URI: process.env.RABBITMQ_URI || process.env.RABITMQ_URI,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

["MONGO_URI", "JWT_SECRET"].forEach((envVar) => {
  if (!_config[envVar]) {
    console.warn(`Warning: Missing required environment variable: ${envVar}`);
  }
});

export default _config;
