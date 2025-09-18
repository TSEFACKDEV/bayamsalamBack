import crypto from 'crypto';

/**
 * Générateur de secrets cryptographiquement sûrs
 */
export class SecurityUtils {
  /**
   * Génère un secret aléatoire sécurisé
   */
  static generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Génère une clé JWT sécurisée
   */
  static generateJWTSecret(): string {
    return this.generateSecureSecret(32);
  }

  /**
   * Génère une clé de session sécurisée
   */
  static generateSessionSecret(): string {
    return this.generateSecureSecret(32);
  }

  /**
   * Valide la force d'un secret
   */
  static validateSecretStrength(secret: string): {
    isSecure: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!secret) {
      issues.push('Secret vide');
      return { isSecure: false, issues };
    }

    if (secret.length < 32) {
      issues.push('Secret trop court (minimum 32 caractères)');
    }

    if (
      secret === 'KleinDev' ||
      secret.toLowerCase().includes('default') ||
      secret.toLowerCase().includes('secret')
    ) {
      issues.push('Secret par défaut ou prévisible détecté');
    }

    if (
      !/[A-Z]/.test(secret) &&
      !/[a-z]/.test(secret) &&
      !/[0-9]/.test(secret)
    ) {
      issues.push('Secret manque de complexité');
    }

    return {
      isSecure: issues.length === 0,
      issues,
    };
  }

  /**
   * Audit de sécurité des variables d'environnement
   */
  static auditEnvironmentSecurity(): {
    securityScore: number;
    issues: Array<{
      variable: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      message: string;
    }>;
    recommendations: string[];
  } {
    const issues: Array<{
      variable: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      message: string;
    }> = [];
    const recommendations: string[] = [];

    // Vérification JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    const jwtValidation = this.validateSecretStrength(jwtSecret || '');
    if (!jwtValidation.isSecure) {
      issues.push({
        variable: 'JWT_SECRET',
        severity: 'HIGH',
        message: `JWT_SECRET faible: ${jwtValidation.issues.join(', ')}`,
      });
      recommendations.push(
        `Générer un nouveau JWT_SECRET: ${this.generateJWTSecret()}`
      );
    }

    // Vérification REFRESH_TOKEN_SECRET_KEY
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET_KEY;
    if (!refreshSecret || refreshSecret.length === 0) {
      issues.push({
        variable: 'REFRESH_TOKEN_SECRET_KEY',
        severity: 'HIGH',
        message: 'REFRESH_TOKEN_SECRET_KEY manquant',
      });
      recommendations.push(
        `Définir REFRESH_TOKEN_SECRET_KEY: ${this.generateSecureSecret()}`
      );
    }

    // Vérification SESSION_SECRET
    const sessionSecret = process.env.SESSION_SECRET;
    const sessionValidation = this.validateSecretStrength(sessionSecret || '');
    if (!sessionValidation.isSecure) {
      issues.push({
        variable: 'SESSION_SECRET',
        severity: 'MEDIUM',
        message: `SESSION_SECRET faible: ${sessionValidation.issues.join(
          ', '
        )}`,
      });
      recommendations.push(
        `Améliorer SESSION_SECRET: ${this.generateSessionSecret()}`
      );
    }

    // Vérification GOOGLE_CLIENT_SECRET
    const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!googleSecret || googleSecret.length === 0) {
      issues.push({
        variable: 'GOOGLE_CLIENT_SECRET',
        severity: 'MEDIUM',
        message: 'GOOGLE_CLIENT_SECRET manquant pour OAuth',
      });
    }

    // Vérification SMTP_PASS
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpPass || smtpPass.length === 0) {
      issues.push({
        variable: 'SMTP_PASS',
        severity: 'MEDIUM',
        message: 'SMTP_PASS manquant pour envoi emails',
      });
    }

    // Calcul du score de sécurité
    const highIssues = issues.filter((i) => i.severity === 'HIGH').length;
    const mediumIssues = issues.filter((i) => i.severity === 'MEDIUM').length;
    const lowIssues = issues.filter((i) => i.severity === 'LOW').length;

    let securityScore = 100;
    securityScore -= highIssues * 30;
    securityScore -= mediumIssues * 15;
    securityScore -= lowIssues * 5;
    securityScore = Math.max(0, securityScore);

    return {
      securityScore,
      issues,
      recommendations,
    };
  }

  /**
   * Exécute un audit de sécurité complet
   */
  static runSecurityAudit(): void {
    console.log('\n🔐 === AUDIT DE SÉCURITÉ BUYANDSALE ===');

    const audit = this.auditEnvironmentSecurity();

    console.log(`📊 Score de sécurité: ${audit.securityScore}/100`);

    if (audit.issues.length > 0) {
      audit.issues.forEach((issue) => {
        const emoji =
          issue.severity === 'HIGH'
            ? '🔴'
            : issue.severity === 'MEDIUM'
              ? '🟡'
              : '🟢';
        console.log(
          `${emoji} [${issue.severity}] ${issue.variable}: ${issue.message}`
        );
      });
    }

    if (audit.recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS:');
      audit.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    if (audit.securityScore === 100) {
    } else if (audit.securityScore >= 70) {
    } else {
      console.log("\n🚨 Configuration de sécurité à améliorer d'urgence!");
    }

    console.log('🔐 === FIN AUDIT SÉCURITÉ ===\n');
  }
}
