"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateValidator = exports.createValidator = exports.readValidator = exports.ultraStrictValidator = exports.strictValidator = void 0;
const securityUtils_js_1 = require("../utils/securityUtils.js");
const securityMonitor_js_1 = require("../utils/securityMonitor.js");
const strictValidator = (rules = {}) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const sanitizationLog = [];
            // 📝 VALIDATION DES QUERY PARAMETERS
            // Search parameter
            if (req.query.search !== undefined && rules.search) {
                const original = String(req.query.search);
                // 🔍 DÉTECTION AVANCÉE D'ATTAQUE
                const attackDetection = (0, securityMonitor_js_1.detectAttackPattern)(original);
                if (attackDetection.detected) {
                    yield (0, securityMonitor_js_1.logSecurityEvent)({
                        type: attackDetection.type,
                        severity: attackDetection.severity,
                        details: {
                            original,
                            sanitized: '',
                            pattern: attackDetection.pattern,
                            reason: 'Attack pattern detected in search parameter',
                        },
                        blocked: false,
                    }, req);
                }
                const sanitized = (0, securityUtils_js_1.sanitizeSearchParam)(original);
                if (original !== sanitized) {
                    sanitizationLog.push({ field: 'search', original, sanitized });
                    // 🚨 LOG DE SÉCURITÉ POUR CHANGEMENTS
                    yield (0, securityMonitor_js_1.logSecurityEvent)({
                        type: securityMonitor_js_1.SecurityEventType.PARAMETER_POLLUTION,
                        severity: 'MEDIUM',
                        details: {
                            original,
                            sanitized,
                            reason: 'Search parameter sanitized',
                        },
                        blocked: false,
                    }, req);
                    req.query.search = sanitized;
                }
            }
            // Page parameter
            if (req.query.page !== undefined && rules.page) {
                const original = String(req.query.page);
                const sanitized = String((0, securityUtils_js_1.sanitizeNumericParam)(req.query.page, 1, 1, 1000));
                if (original !== sanitized) {
                    sanitizationLog.push({ field: 'page', original, sanitized });
                    req.query.page = sanitized;
                }
            }
            // Limit parameter
            if (req.query.limit !== undefined && rules.limit) {
                const original = String(req.query.limit);
                const sanitized = String((0, securityUtils_js_1.sanitizeNumericParam)(req.query.limit, 10, 1, 100));
                if (original !== sanitized) {
                    sanitizationLog.push({ field: 'limit', original, sanitized });
                    req.query.limit = sanitized;
                }
            }
            // CategoryId parameter
            if (req.query.categoryId !== undefined && rules.categoryId) {
                const original = String(req.query.categoryId);
                const sanitized = String((0, securityUtils_js_1.sanitizeNumericParam)(req.query.categoryId, 0, 1, 999999));
                if (original !== sanitized) {
                    sanitizationLog.push({ field: 'categoryId', original, sanitized });
                    req.query.categoryId = sanitized;
                }
            }
            // CityId parameter
            if (req.query.cityId !== undefined && rules.cityId) {
                const original = String(req.query.cityId);
                const sanitized = String((0, securityUtils_js_1.sanitizeNumericParam)(req.query.cityId, 0, 1, 999999));
                if (original !== sanitized) {
                    sanitizationLog.push({ field: 'cityId', original, sanitized });
                    req.query.cityId = sanitized;
                }
            }
            // 🚨 LOGGING DE SÉCURITÉ UNIFIÉ
            if (sanitizationLog.length > 0) {
                // 🔥 LOG AVANCÉ UNIFIÉ (remplace les deux anciens logs)
                yield (0, securityMonitor_js_1.logSecurityEvent)({
                    type: securityMonitor_js_1.SecurityEventType.PARAMETER_POLLUTION,
                    severity: 'MEDIUM',
                    details: {
                        original: JSON.stringify(sanitizationLog),
                        sanitized: `${sanitizationLog.length} fields processed`,
                        reason: 'Multiple parameters required sanitization',
                    },
                    blocked: false,
                }, req);
                // 🎯 Ajouter les logs à la réponse en mode développement
                if (process.env.NODE_ENV === 'development') {
                    res.locals.sanitizationLog = sanitizationLog;
                }
            }
            next();
        }
        catch (error) {
            console.error('🚨 [STRICT_VALIDATOR] Erreur:', error);
            next(error);
        }
    });
};
exports.strictValidator = strictValidator;
/**
 * 🔒 VALIDATION ULTRA-STRICTE POUR RECHERCHE
 *
 * Bloque les requêtes suspectes sans les laisser passer
 */
const ultraStrictValidator = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const search = String(req.query.search || '');
            // 🔍 DÉTECTION STRICTE
            const attackDetection = (0, securityMonitor_js_1.detectAttackPattern)(search);
            if (attackDetection.detected && attackDetection.severity === 'HIGH') {
                yield (0, securityMonitor_js_1.logSecurityEvent)({
                    type: attackDetection.type,
                    severity: 'HIGH',
                    details: {
                        original: search,
                        sanitized: '',
                        pattern: attackDetection.pattern,
                        reason: 'High-risk attack pattern blocked',
                    },
                    blocked: true,
                }, req);
                return res.status(400).json({
                    status: 400,
                    message: 'Paramètre de recherche invalide',
                    code: 'INVALID_SEARCH_PARAM',
                });
            }
            next();
        }
        catch (error) {
            console.error('🚨 [ULTRA_STRICT_VALIDATOR] Erreur:', error);
            next(error);
        }
    });
};
exports.ultraStrictValidator = ultraStrictValidator;
// Aliases pour la compatibilité avec le code existant
exports.readValidator = (0, exports.strictValidator)({
    search: true,
    page: true,
    limit: true,
    categoryId: true,
    cityId: true,
});
exports.createValidator = (0, exports.strictValidator)({ search: true });
exports.updateValidator = (0, exports.strictValidator)({ search: true });
exports.default = {
    strictValidator: exports.strictValidator,
    ultraStrictValidator: exports.ultraStrictValidator,
    readValidator: exports.readValidator,
    createValidator: exports.createValidator,
    updateValidator: exports.updateValidator,
};
