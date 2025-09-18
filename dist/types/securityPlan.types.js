"use strict";
/**
 * 🔐 PLAN D'AMÉLIORATION SÉCURITÉ - PRIORITÉ 2
 * Plan détaillé d'implémentation sans impact frontend
 * Date: 18 septembre 2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_CHECKLIST = exports.FRONTEND_COMPATIBILITY = exports.IMPLEMENTATION_PHASES = exports.CRITICAL_VULNERABILITIES = exports.SECURITY_SUMMARY = void 0;
/**
 * 🚨 RÉSUMÉ EXÉCUTIF DE SÉCURITÉ
 */
exports.SECURITY_SUMMARY = {
    totalVulnerabilities: 9,
    criticalCount: 3,
    highCount: 3,
    mediumCount: 3,
    lowCount: 0,
    estimatedFixTime: '6-8 heures',
    frontendBreakingChanges: 0,
};
/**
 * 🔥 VULNÉRABILITÉS CRITIQUES IDENTIFIÉES
 */
exports.CRITICAL_VULNERABILITIES = [
    {
        id: 'CRIT-001',
        title: 'Injection NoSQL via paramètre de recherche',
        severity: 'CRITICAL',
        location: 'getAllProducts() & getValidatedProducts()',
        description: 'Les paramètres de recherche ne sont pas sanitisés et peuvent permettre des injections NoSQL',
        currentCode: `const search = (req.query.search as string) || "";`,
        risk: 'Accès non autorisé aux données, contournement des filtres de sécurité',
        frontendImpact: 'NONE',
    },
    {
        id: 'CRIT-002',
        title: 'Upload de fichiers non sécurisé',
        severity: 'CRITICAL',
        location: 'createProduct() & updateProduct()',
        description: 'Utilisation de Utils.saveFile au lieu du système sécurisé uploadProductImages',
        currentCode: `const savedPath = await Utils.saveFile(img, "products");`,
        risk: 'Upload de fichiers malveillants, exécution de code arbitraire',
        frontendImpact: 'NONE',
    },
    {
        id: 'CRIT-003',
        title: 'XSS Stocké dans les champs produit',
        severity: 'CRITICAL',
        location: 'createProduct() - validation Yup',
        description: 'Validation insuffisante contre les attaques XSS dans name, description, etc.',
        currentCode: `name: yup.string().required("Le nom est requis")`,
        risk: 'Exécution de scripts malveillants côté client, vol de données utilisateur',
        frontendImpact: 'NONE',
    },
];
/**
 * 🎯 PHASES D'IMPLÉMENTATION SÉCURISÉES
 */
exports.IMPLEMENTATION_PHASES = [
    {
        phase: 1,
        title: '🚨 Sécurisation Critique Immédiate',
        duration: '2-3 heures',
        risk: 'TRÈS FAIBLE',
        frontendImpact: 'NONE',
        tasks: [
            {
                id: 'TASK-001',
                title: 'Sécuriser les paramètres de recherche',
                description: 'Ajouter sanitization et validation des paramètres de recherche pour prévenir les injections NoSQL',
                files: [
                    'src/controllers/product.controller.ts',
                    'src/utils/securityUtils.ts',
                ],
                changes: [
                    'Créer une fonction de sanitization des paramètres de recherche',
                    'Remplacer les paramètres directs par des paramètres sanitisés',
                    'Ajouter validation des caractères autorisés',
                ],
                validation: [
                    'Tester la recherche avec des caractères spéciaux',
                    'Vérifier que la fonctionnalité de recherche fonctionne normalement',
                    'Confirmer que les injections sont bloquées',
                ],
            },
            {
                id: 'TASK-002',
                title: 'Remplacer Utils.saveFile par uploadProductImages',
                description: "Utiliser le système d'upload sécurisé existant dans createProduct et updateProduct",
                files: ['src/controllers/product.controller.ts'],
                changes: [
                    'Remplacer Utils.saveFile par uploadProductImages dans createProduct',
                    'Remplacer Utils.saveFile par uploadProductImages dans updateProduct',
                    "Ajuster la logique de gestion des erreurs d'upload",
                ],
                validation: [
                    "Tester la création de produits avec différents types d'images",
                    'Vérifier que les images sont optimisées en WebP',
                    'Confirmer que les validations de sécurité fonctionnent',
                ],
            },
            {
                id: 'TASK-003',
                title: 'Renforcer la validation anti-XSS',
                description: 'Améliorer les schémas Yup pour prévenir les attaques XSS',
                files: [
                    'src/validations/product.validation.ts',
                    'src/utils/securityUtils.ts',
                ],
                changes: [
                    'Ajouter sanitization HTML dans les schémas Yup',
                    'Créer des validateurs personnalisés anti-XSS',
                    'Valider tous les champs texte (name, description, quartier)',
                ],
                validation: [
                    'Tester avec des scripts malveillants dans les champs',
                    'Vérifier que les données sont correctement sanitisées',
                    'Confirmer que le frontend reçoit des données propres',
                ],
            },
        ],
    },
    {
        phase: 2,
        title: '🛡️ Protection et Monitoring',
        duration: '2-3 heures',
        risk: 'FAIBLE',
        frontendImpact: 'MINIMAL',
        tasks: [
            {
                id: 'TASK-004',
                title: 'Implémenter Rate Limiting',
                description: 'Ajouter une protection contre les abus sur les endpoints publics',
                files: [
                    'src/middlewares/rateLimiter.ts',
                    'src/routes/product.routes.ts',
                ],
                changes: [
                    'Créer un middleware de rate limiting',
                    "Appliquer des limites différentes selon l'endpoint",
                    'Ajouter des headers informatifs pour le frontend',
                ],
                validation: [
                    'Tester les limites de taux',
                    'Vérifier que les erreurs 429 sont gérées',
                    'Confirmer que le frontend peut gérer les limites',
                ],
            },
            {
                id: 'TASK-005',
                title: 'Améliorer la validation des paramètres',
                description: 'Validation stricte de tous les paramètres de requête et URL',
                files: [
                    'src/controllers/product.controller.ts',
                    'src/utils/validationUtils.ts',
                ],
                changes: [
                    'Valider les IDs de produits (format UUID)',
                    'Valider les paramètres numériques (page, limit, prix)',
                    'Valider les énumérations (status, etat)',
                ],
                validation: [
                    'Tester avec des paramètres invalides',
                    "Vérifier les messages d'erreur appropriés",
                    'Confirmer la compatibilité frontend',
                ],
            },
        ],
    },
    {
        phase: 3,
        title: '📊 Monitoring et Logs de Sécurité',
        duration: '2 heures',
        risk: 'FAIBLE',
        frontendImpact: 'NONE',
        tasks: [
            {
                id: 'TASK-006',
                title: 'Ajouter des logs de sécurité',
                description: "Logging des tentatives d'attaque et actions sensibles",
                files: [
                    'src/utils/securityLogger.ts',
                    'src/controllers/product.controller.ts',
                ],
                changes: [
                    'Créer un système de logs de sécurité',
                    "Logger les tentatives d'injection",
                    'Logger les uploads suspects',
                    'Logger les accès non autorisés',
                ],
                validation: [
                    'Vérifier que les logs sont générés',
                    'Tester la rotation des logs',
                    'Confirmer que les données sensibles ne sont pas loggées',
                ],
            },
        ],
    },
];
/**
 * ✅ GARANTIE DE COMPATIBILITÉ FRONTEND
 */
exports.FRONTEND_COMPATIBILITY = {
    apiChanges: false,
    responseStructureChanges: false,
    newValidationErrors: true, // Mais cohérentes avec l'existant
    backwardCompatible: true,
    testingRequired: false, // Seuls les tests de sécurité sont nécessaires
};
/**
 * 📋 CHECKLIST DE VALIDATION
 */
exports.VALIDATION_CHECKLIST = [
    '✅ Toutes les réponses API gardent la même structure',
    "✅ Les codes d'erreur restent cohérents",
    "✅ Les validations ajoutent de la sécurité sans casser l'existant",
    "✅ Les uploads d'images fonctionnent de la même manière côté frontend",
    '✅ Les recherches et filtres fonctionnent normalement',
    '✅ Aucun nouveau champ requis dans les requêtes',
    '✅ Rate limiting avec headers informatifs',
    "✅ Messages d'erreur clairs et cohérents",
];
exports.default = {
    SECURITY_SUMMARY: exports.SECURITY_SUMMARY,
    CRITICAL_VULNERABILITIES: exports.CRITICAL_VULNERABILITIES,
    IMPLEMENTATION_PHASES: exports.IMPLEMENTATION_PHASES,
    FRONTEND_COMPATIBILITY: exports.FRONTEND_COMPATIBILITY,
    VALIDATION_CHECKLIST: exports.VALIDATION_CHECKLIST,
};
