import express from 'express';
import * as authController from '../controller/auth.controller.js';
import * as validationRule from '../middlewares/validation.middlewares.js';
import passport from 'passport';


const router = express.Router();

// @route   POST /api/auth/register

router.post('/register', validationRule.registerUserValidationRules, authController.register);

// Route to initiate Google OAuth flow

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);


// Callback route that Google will redirect to after authentication

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
    authController.googleOAuthCallback
  
);

router.get('/google/failure', (req, res) => {
  return res.status(401).json({ message: 'Google authentication failed' });
});

export default router;