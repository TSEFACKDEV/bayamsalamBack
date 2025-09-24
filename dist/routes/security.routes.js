"use strict";
/**
 * 🔐 ROUTES DE MONITORING DE SÉCURITÉ - BuyAndSale
 *
 * Endpoints sécurisés pour la surveillance et l'analyse des événements de sécurité
 * Accès réservé aux super administrateurs uniquement
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const security_controller_js_1 = require("../controllers/security.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const rateLimiter_js_1 = require("../middlewares/rateLimiter.js");
const router = (0, express_1.Router)();
/**
 * 📊 STATISTIQUES GÉNÉRALES DE SÉCURITÉ
 *
 /**
 * GET /api/buyandsale/security/stats
 *
 * Retourne un aperçu complet de la sécurité :
 * - Nombre total d'attaques détectées
 * - Types d'attaques les plus fréquents
 * - IPs suspectes
 * - Score de sécurité global
 * - Recommandations
 */
router.get("/stats", rateLimiter_js_1.generalRateLimiter, auth_middleware_js_1.isAdmin, // 🔒 Super Admin uniquement
security_controller_js_1.getSecurityStatistics);
/**
 * 📋 ÉVÉNEMENTS DE SÉCURITÉ RÉCENTS
 *
 * GET /api/buyandsale/security/events
 *
 * Query parameters:
 * - limit: nombre d'événements à retourner (défaut: 50)
 * - offset: décalage pour la pagination (défaut: 0)
 *
 * Retourne la liste des tentatives d'attaque récentes avec :
 * - Type d'événement
 * - Timestamp
 * - IP source
 * - Utilisateur (si connecté)
 * - Sévérité
 * - Détails de l'attaque
 */
router.get("/events", rateLimiter_js_1.generalRateLimiter, auth_middleware_js_1.isAdmin, // 🔒 Super Admin uniquement
security_controller_js_1.getRecentSecurityEvents);
/**
 * 🎯 ANALYSE D'UNE IP SPÉCIFIQUE
 *
 * GET /api/buyandsale/security/ip/:ip
 *
 * Analyse détaillée d'une adresse IP :
 * - Historique des requêtes
 * - Événements de sécurité
 * - Score de risque
 * - Recommandations d'action
 * - Timeline des activités
 */
router.get("/ip/:ip", rateLimiter_js_1.generalRateLimiter, auth_middleware_js_1.isAdmin, // 🔒 Super Admin uniquement
security_controller_js_1.analyzeIP);
exports.default = router;
