/**
 * Utilitaires de validation de sécurité pour les inputs utilisateur
 * Compatible avec l'API existante - ne change pas les réponses
 */

export interface PasswordStrength {
  score: number;
  feedback: string[];
  isSecure: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Valide la force d'un mot de passe selon les standards de sécurité
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      feedback: ['Mot de passe requis'],
      isSecure: false,
    };
  }

  // Longueur minimale (8 caractères)
  if (password.length < 8) {
    feedback.push('Le mot de passe doit contenir au moins 8 caractères');
  } else {
    score += 1;
  }

  // Présence de majuscules
  if (!/[A-Z]/.test(password)) {
    feedback.push(
      'Le mot de passe doit contenir au moins une lettre majuscule'
    );
  } else {
    score += 1;
  }

  // Présence de minuscules
  if (!/[a-z]/.test(password)) {
    feedback.push(
      'Le mot de passe doit contenir au moins une lettre minuscule'
    );
  } else {
    score += 1;
  }

  // Présence de chiffres
  if (!/\d/.test(password)) {
    feedback.push('Le mot de passe doit contenir au moins un chiffre');
  } else {
    score += 1;
  }

  // Présence de caractères spéciaux
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push(
      'Le mot de passe doit contenir au moins un caractère spécial'
    );
  } else {
    score += 1;
  }

  // Bonus pour longueur recommandée (12+ caractères)
  if (password.length >= 12) {
    score += 1;
  }

  // Mots de passe communs à éviter
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'user'];
  if (
    commonPasswords.some((common) => password.toLowerCase().includes(common))
  ) {
    feedback.push('Évitez les mots de passe communs');
    score = Math.max(0, score - 2);
  }

  return {
    score,
    feedback,
    isSecure: score >= 4, // Au moins 4 critères sur 6
  };
}

/**
 * Valide le format d'un email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return {
      isValid: false,
      message: 'Email requis',
    };
  }

  // Normaliser l'email
  const normalizedEmail = email.toLowerCase().trim();

  // Regex simple mais robuste pour les emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      message: "Format d'email invalide",
    };
  }

  // Vérifications supplémentaires
  if (normalizedEmail.length > 254) {
    return {
      isValid: false,
      message: 'Email trop long',
    };
  }

  return { isValid: true };
}

/**
 * Valide le format d'un numéro de téléphone
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return {
      isValid: false,
      message: 'Numéro de téléphone requis',
    };
  }

  // Nettoyer le numéro (enlever espaces, tirets, parenthèses)
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Accepter différents formats internationaux
  const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      message: 'Format de numéro de téléphone invalide',
    };
  }

  return { isValid: true };
}

/**
 * Valide et normalise les données d'inscription
 */
export function validateAndNormalizeRegistration(data: any): {
  isValid: boolean;
  message?: string;
  normalizedData?: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  };
} {
  if (!data) {
    return {
      isValid: false,
      message: 'Données manquantes',
    };
  }

  const { email, firstName, lastName, phone, password } = data;

  // Vérification de présence des champs
  if (!email || !firstName || !lastName || !phone || !password) {
    return {
      isValid: false,
      message: 'Tous les champs sont obligatoires',
    };
  }

  // Validation de l'email
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return {
      isValid: false,
      message: emailValidation.message,
    };
  }

  // Validation du téléphone
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    return {
      isValid: false,
      message: phoneValidation.message,
    };
  }

  // Validation du mot de passe
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isSecure) {
    return {
      isValid: false,
      message: passwordValidation.feedback.join(', '),
    };
  }

  // Normalisation des données
  const normalizedData = {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.replace(/[\s\-\(\)]/g, ''),
    password: password, // Ne pas modifier le mot de passe
  };

  return {
    isValid: true,
    normalizedData,
  };
}

/**
 * Valide les données de connexion (compatible avec identifiant ou email)
 */
export function validateLoginData(data: any): ValidationResult {
  if (!data) {
    return {
      isValid: false,
      message: 'Données manquantes',
    };
  }

  // Support pour les deux formats : {email, password} et {identifiant, password}
  const identifier = data.email || data.identifiant;
  const { password } = data;

  if (!identifier || !password) {
    return {
      isValid: false,
      message: 'Identifiant et mot de passe requis',
    };
  }

  // Validation basique de l'identifiant s'il ressemble à un email
  if (identifier.includes('@')) {
    const emailValidation = validateEmail(identifier);
    if (!emailValidation.isValid) {
      return {
        isValid: false,
        message: "Format d'email invalide",
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitise une chaîne pour éviter les injections
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .trim()
    .replace(/[<>]/g, '') // Enlever les balises HTML basiques
    .substring(0, 1000); // Limiter la longueur
}
