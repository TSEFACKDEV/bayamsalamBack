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
import { forgotPasswordSchema, loginSchema, logoutSchema, refreshTokenSchema, registerSchema, resetPasswordSchema, verifyOTPSchema } from "../validations/auth.validation.js";
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
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_auth_failed` 
  }),
  googleCallback
);

router.use(authenticate);
router.get("/me", getUserProfile);

export default router;
