import * as yup from 'yup';

// min 6 characters, 1 upper case letter, 1 lower case letter, 1 numeric digit.
const passwordRules = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;

export const registerSchema = yup.object({
  email: yup.string().email().required(),
  password: yup
    .string()
    .matches(passwordRules, { message: 'Please create a stronger password' })
    .required()
    .min(6),
  firstName: yup.string().required(),
  lastName: yup.string().required(),
  phone: yup.string().required(),
});

export const verifyOTPSchema = yup.object({
  otp: yup.string().required(),
  userId: yup.string().required(),
});

export const loginSchema = yup.object({
  identifiant: yup.string().required(),
  password: yup.string().required(),
});

export const refreshTokenSchema = yup.object({
  // Le refresh token est récupéré dans le cookie, pas dans le body
});

export const logoutSchema = yup.object({
  // La déconnexion utilise le cookie, pas le body
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().email().required(),
});

export const resetPasswordSchema = yup.object({
  token: yup.string().required(),
  newPassword: yup
    .string()
    .matches(passwordRules, { message: 'Please create a stronger password' })
    .required()
    .min(6),
});
