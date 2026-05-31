import express from 'express';
import * as authController from '../controller/auth.controller.js';
import * as validationRule from '../middlewares/validation.middlewares.js';
import passport from 'passport';
import config from '../config/config.js';
import { verifyToken } from '../middlewares/auth.middlewares.js';
import multer from 'multer';
import { isValidImageBuffer } from '../utils/file-validation.utils.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for profileImage. Allowed types: JPEG, PNG, WebP"));
    }
  },
});


const router = express.Router();

function validateProfileImageContent(req, res, next) {
  if (req.file && !isValidImageBuffer(req.file)) {
    return res.status(400).json({ success: false, message: 'Invalid profile image content' });
  }
  next();
}

// @route   POST /api/auth/register
router.post('/register', validationRule.registerUserValidationRules, authController.register);

// @route   POST /api/auth/login
router.post('/login', validationRule.loginUserValidationRules, authController.login);

// @route   POST /api/auth/logout
router.post('/logout', authController.logout);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
router.post('/reset-password/:token', authController.resetPassword);

// @route   GET /api/auth/me (Get profile)
router.get('/me', verifyToken, authController.getProfile);

// @route   PUT /api/auth/profile (Update profile)
router.put('/profile', verifyToken, upload.single('profileImage'), validateProfileImageContent, authController.updateProfile);

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
  return res.redirect(`${config.FRONTEND_URL}/login?error=Google%20authentication%20failed`);
});

export default router;
