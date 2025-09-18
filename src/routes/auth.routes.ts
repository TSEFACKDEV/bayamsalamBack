import express from 'express';
import {
  forgotPassword,
  getUserProfile,
  login,
  logout,
  register,
  resetPassword,
  verifyOTP,
  refreshToken,
  googleCallback, // Nouvelle fonction
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOTPSchema,
} from '../validations/auth.validation.js';
import validate from '../middlewares/validation.js';
import passport from '../config/passport.config.js'; // Importer passport
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Routes existantes
router.post('/register', authRateLimiter, validate(registerSchema), register); // 🚦 Rate limiting
router.post(
  '/verify-otp',
  authRateLimiter,
  validate(verifyOTPSchema),
  verifyOTP
); // 🚦 Rate limiting
router.post('/login', authRateLimiter, validate(loginSchema), login); // 🚦 Rate limiting
router.post('/logout', validate(logoutSchema), logout);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
); // 🚦 Rate limiting
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  resetPassword
); // 🚦 Rate limiting

// Routes pour l'authentification Google
router.get(
  '/google',
  // Nettoyer la session avant l'authentification pour éviter les conflits
  (req, res, next) => {
    // Détruire la session existante pour éviter les conflits
    if (req.session) {
      req.session.destroy((err) => {
        if (err)
          console.error('Erreur lors de la destruction de session:', err);
      });
    }
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // Forcer une nouvelle authentification pour éviter les conflits
    prompt: 'select_account',
  })
);

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      session: true, // Utiliser les sessions maintenant
      failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_auth_failed`,
    })(req, res, (err: any) => {
      if (err) {
        console.error('Erreur callback Google:', err);
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/login?error=auth_failed`
        );
      }
      next();
    });
  },
  googleCallback
);

router.use(authenticate);
router.get('/me', getUserProfile);

export default router;
