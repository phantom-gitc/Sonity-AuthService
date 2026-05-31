import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import config from './config/config.js';
import cors from 'cors';
import mongoose from 'mongoose';
import { createRateLimiter, securityHeaders } from './middlewares/security.middlewares.js';


const app = express();

app.use(cors({
  origin: config.FRONTEND_URL, // Allow requests from configured frontend origin
  credentials: true, // Allow cookies to be sent with requests
}));

// Middleware setup
app.use(securityHeaders);
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 250 }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// Initialize Passport middleware for authentication 

app.use(passport.initialize());

// Configure Passport to use Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  callbackURL: config.GOOGLE_CALLBACK_URL,
  proxy: true,
}, (accessToken, refreshToken, profile, done) => {
  // Here, you would typically find or create a user in your database
  // For this example, we'll just return the profile
  return done(null, profile);
}));




// Routes setup 
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, service: 'auth', status: 'healthy' });
});

app.get('/ready', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(isDbReady ? 200 : 503).json({
    success: isDbReady,
    service: 'auth',
    database: isDbReady ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl });
});

app.use((error, req, res, next) => {
  console.error('Auth global error handler:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    error: config.NODE_ENV === 'development' ? error : {},
  });
});

export default app ;
