"use strict";
/**
 * 🔐 UTILITAIRES DE SÉCURITÉ - SANITIZATION INTELLIGENTE
 *
 * Module centralisant toutes les fonctions de sécurisation des données
 * pour prévenir les injections NoSQL, XSS et autres vulnérabilités.
 *
 * PRINCIPE : Nettoyer sans casser l'expérience utilisateur
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSearchParam = sanitizeSearchParam;
exports.sanitizeXSS = sanitizeXSS;
exports.sanitizeNumericParam = sanitizeNumericParam;
exports.sanitizeFloatParam = sanitizeFloatParam;
exports.sanitizeProductName = sanitizeProductName;
exports.sanitizeDescription = sanitizeDescription;
exports.sanitizeUUID = sanitizeUUID;
/**
 * 🔍 SANITIZATION DES PARAMÈTRES DE RECHERCHE
 *
 * Nettoie les paramètres de recherche pour prévenir les injections NoSQL
 * tout en conservant une recherche fonctionnelle.
 *
 * @param searchParam Paramètre de recherche brut
 * @returns Paramètre sanitisé sûr pour Prisma
 */
function sanitizeSearchParam(searchParam) {
    // Si pas de paramètre, retourner chaîne vide
    if (!searchParam || typeof searchParam !== 'string') {
        return '';
    }
    // Convertir en string et nettoyer
    let sanitized = String(searchParam).trim();
    // Supprimer les caractères dangereux pour NoSQL
    // Garder : lettres, chiffres, espaces, accents, apostrophes, tirets
    sanitized = sanitized.replace(/[^\w\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF'-]/g, '');
    // Limiter la longueur pour éviter les attaques par déni de service
    const MAX_SEARCH_LENGTH = 100;
    if (sanitized.length > MAX_SEARCH_LENGTH) {
        sanitized = sanitized.substring(0, MAX_SEARCH_LENGTH);
    }
    // Supprimer les espaces multiples
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return sanitized;
}
/**
 * 🛡️ SANITIZATION ANTI-XSS INTELLIGENTE
 *
 * Nettoie le contenu HTML/JavaScript malveillant tout en préservant
 * le texte légitime avec accents, ponctuation, etc.
 *
 * @param input Texte à sanitiser
 * @returns Texte nettoyé et sécurisé
 */
function sanitizeXSS(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    let sanitized = String(input).trim();
    // Supprimer les balises HTML/XML
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    // Supprimer les attributs JavaScript dangereux
    sanitized = sanitized.replace(/on\w+\s*=\s*['""].*?['"']/gi, '');
    // Supprimer javascript: et data: schemes
    sanitized = sanitized.replace(/(javascript|data|vbscript):/gi, '');
    // Supprimer les caractères de contrôle dangereux
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Encoder les caractères HTML dangereux restants
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    // Limiter la longueur selon le type de champ
    const MAX_TEXT_LENGTH = 1000;
    if (sanitized.length > MAX_TEXT_LENGTH) {
        sanitized = sanitized.substring(0, MAX_TEXT_LENGTH);
    }
    return sanitized;
}
/**
 * 🔢 VALIDATION ET SANITIZATION DES PARAMÈTRES NUMÉRIQUES
 *
 * Valide et convertit les paramètres numériques de manière sécurisée.
 *
 * @param param Paramètre à valider
 * @param defaultValue Valeur par défaut si invalide
 * @param min Valeur minimale autorisée
 * @param max Valeur maximale autorisée
 * @returns Nombre validé et sécurisé
 */
function sanitizeNumericParam(param, defaultValue, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    if (!param)
        return defaultValue;
    const parsed = typeof param === 'string' ? parseInt(param, 10) : Number(param);
    // Vérifier si c'est un nombre valide
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    // Appliquer les limites
    if (parsed < min)
        return min;
    if (parsed > max)
        return max;
    return parsed;
}
/**
 * 🔢 VALIDATION ET SANITIZATION DES PARAMÈTRES DÉCIMAUX
 *
 * Valide et convertit les paramètres décimaux (prix, etc.) de manière sécurisée.
 */
function sanitizeFloatParam(param, defaultValue, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (!param)
        return defaultValue;
    const parsed = typeof param === 'string' ? parseFloat(param) : Number(param);
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    if (parsed < min)
        return min;
    if (parsed > max)
        return max;
    return parsed;
}
/**
 * 📝 SANITIZATION SPÉCIALISÉE POUR LES NOMS DE PRODUITS
 *
 * Validation spécifique pour les noms de produits avec préservation
 * des caractères légitimes commerciaux.
 */
function sanitizeProductName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    let sanitized = String(name).trim();
    // Supprimer uniquement les caractères dangereux, garder les caractères commerciaux
    // Autorisé : lettres, chiffres, espaces, accents, tirets, parenthèses, points, virgules
    sanitized = sanitized.replace(/[^\w\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF()\-.,'/]/g, '');
    // Nettoyer HTML/JS
    sanitized = sanitizeXSS(sanitized);
    // Limiter longueur
    const MAX_NAME_LENGTH = 100;
    if (sanitized.length > MAX_NAME_LENGTH) {
        sanitized = sanitized.substring(0, MAX_NAME_LENGTH);
    }
    return sanitized;
}
/**
 * 📝 SANITIZATION POUR LES DESCRIPTIONS
 *
 * Permet plus de caractères pour les descriptions tout en restant sécurisé.
 */
function sanitizeDescription(description) {
    if (!description || typeof description !== 'string') {
        return '';
    }
    let sanitized = String(description).trim();
    // Supprimer HTML/JS mais garder la ponctuation et les retours ligne
    sanitized = sanitizeXSS(sanitized);
    // Limiter longueur
    const MAX_DESC_LENGTH = 2000;
    if (sanitized.length > MAX_DESC_LENGTH) {
        sanitized = sanitized.substring(0, MAX_DESC_LENGTH);
    }
    return sanitized;
}
/**
 * 🆔 VALIDATION DES IDENTIFIANTS UUID
 *
 * Valide que les IDs sont bien des UUIDs valides.
 */
function sanitizeUUID(id) {
    if (!id || typeof id !== 'string') {
        return null;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) ? id : null;
}
// Note: logSecurityEvent a été migrée vers securityMonitor.ts pour plus de fonctionnalités
exports.default = {
    sanitizeSearchParam,
    sanitizeXSS,
    sanitizeNumericParam,
    sanitizeFloatParam,
    sanitizeProductName,
    sanitizeDescription,
    sanitizeUUID,
};
