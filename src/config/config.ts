import dotenv from 'dotenv';

dotenv.config();

interface Env {
  port: string;
  host: string;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtResetExpiresIn: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  nexahUser: string;
  nexahPassword: string;
  nexahSenderId: string;
  frontendUrl: string;
  refreshTokenSecretKey: string;
  sessionSecret: string; // Nouveau champ pour la session

  // Nouveaux champs pour Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

 

  // Variables pour Campay
  campay_base_url: string;
  campay_username: string;
  campay_password: string;
  campay_app_id: string;

  // node environement
  NODE_ENV: string;
}

const env: Env = {
  port: process.env.PORT || '3001',
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'KleinDev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtResetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT || '587',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || '',
  fromName: process.env.FROM_NAME || '',
  nexahUser: process.env.NEXAH_USER || '',
  nexahPassword: process.env.NEXAH_PASSWORD || '',
  nexahSenderId: process.env.NEXAH_SENDER_ID || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  refreshTokenSecretKey: process.env.REFRESH_TOKEN_SECRET_KEY || '',
  sessionSecret:
    process.env.SESSION_SECRET || 'buyandsale-super-secret-session-key-2024',

  // Nouveaux champs pour Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    `http://127.0.0.1:3001/api/buyandsale/auth/google/callback`,


  // Variables pour Campay
  campay_base_url: process.env.campay_base_url || 'https://demo.campay.net/api',
  campay_username: process.env.campay_username || '',
  campay_password: process.env.campay_password || '',
  campay_app_id: process.env.campay_app_id || '',

  // node environement
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// 🔴 LOGS DE DÉBOGAGE
console.log('🔧 Variables Campay chargées:', {
  campay_base_url: env.campay_base_url,
  campay_username: env.campay_username ? `Défini (${env.campay_username.length} chars)` : '❌ MANQUANT',
  campay_password: env.campay_password ? `Défini (${env.campay_password.length} chars)` : '❌ MANQUANT',
  campay_app_id: env.campay_app_id ? `Défini (${env.campay_app_id.length} chars)` : '❌ MANQUANT',
});

export default env;
