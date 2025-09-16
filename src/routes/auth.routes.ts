import express from "express";
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
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOTPSchema,
} from "../validations/auth.validation.js";
import validate from "../middlewares/validation.js";
import passport from "../config/passport.config.js"; // Importer passport

const router = express.Router();

// Routes existantes
router.post("/register", validate(registerSchema), register);
router.post("/verify-otp", validate(verifyOTPSchema), verifyOTP);
router.post("/login", validate(loginSchema), login);
router.post("/logout", validate(logoutSchema), logout);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Routes pour l'authentification Google
router.get(
  "/google",
  // Nettoyer la session avant l'authentification pour éviter les conflits
  (req, res, next) => {
    // Détruire la session existante pour éviter les conflits
    if (req.session) {
      req.session.destroy((err) => {
        if (err)
          console.error("Erreur lors de la destruction de session:", err);
      });
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    // Forcer une nouvelle authentification pour éviter les conflits
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", {
      session: true, // Utiliser les sessions maintenant
      failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_auth_failed`,
    })(req, res, (err: any) => {
      if (err) {
        console.error("Erreur callback Google:", err);
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
router.get("/me", getUserProfile);

export default router;
