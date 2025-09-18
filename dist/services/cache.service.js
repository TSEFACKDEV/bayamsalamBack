"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
/**
 * 🚀 Service de cache in-memory optimisé avec TTL intelligent
 * Utilise node-cache pour améliorer les performances des requêtes répétitives
 */
class CacheService {
    constructor() {
        // TTL en secondes pour différents types de données
        this.TTL = {
            CATEGORIES: 300, // 5 minutes - changent rarement
            CITIES: 600, // 10 minutes - très stables
            HOMEPAGE_PRODUCTS: 180, // 3 minutes - plus dynamiques
            USER_STATS: 120, // 2 minutes - évoluent avec les reviews
        };
        // Préfixes des clés pour une meilleure organisation
        this.KEYS = {
            CATEGORIES: "categories",
            CITIES: "cities",
            HOMEPAGE_PRODUCTS: "homepage_products",
            USER_STATS: "user_stats",
        };
        this.cache = new node_cache_1.default({
            stdTTL: this.TTL.HOMEPAGE_PRODUCTS, // TTL par défaut
            checkperiod: 60, // Nettoyage toutes les 60s
            useClones: false, // Performance: évite le clonage
            deleteOnExpire: true, // Nettoyage automatique
        });
        // Logs pour le monitoring
        this.setupEventListeners();
    }
    /**
     * Configuration des événements pour le monitoring
     */
    setupEventListeners() {
        this.cache.on("expired", (key) => {
            // Cache expiré et supprimé
        });
        this.cache.on("flush", () => {
            // Cache vidé complètement
        });
    }
    // === MÉTHODES GÉNÉRIQUES ===
    get(key) {
        return this.cache.get(key);
    }
    set(key, value, ttl) {
        return this.cache.set(key, value, ttl || this.TTL.HOMEPAGE_PRODUCTS);
    }
    del(key) {
        return this.cache.del(key);
    }
    flush() {
        this.cache.flushAll();
    }
    // === MÉTHODES SPÉCIALISÉES ===
    /**
     * 📂 Gestion du cache des catégories
     */
    getCategories() {
        return this.get(this.KEYS.CATEGORIES);
    }
    setCategories(categories) {
        return this.set(this.KEYS.CATEGORIES, categories, this.TTL.CATEGORIES);
    }
    invalidateCategories() {
        this.del(this.KEYS.CATEGORIES);
    }
    /**
     * 🏙️ Gestion du cache des villes
     */
    getCities() {
        return this.get(this.KEYS.CITIES);
    }
    setCities(cities) {
        return this.set(this.KEYS.CITIES, cities, this.TTL.CITIES);
    }
    invalidateCities() {
        this.del(this.KEYS.CITIES);
    }
    /**
     * 🏠 Gestion du cache des produits homepage
     */
    getHomepageProducts(limit) {
        return this.get(`${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`);
    }
    setHomepageProducts(limit, data) {
        return this.set(`${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`, data, this.TTL.HOMEPAGE_PRODUCTS);
    }
    invalidateHomepageProducts() {
        this.invalidateByPrefix(this.KEYS.HOMEPAGE_PRODUCTS);
    }
    /**
     * 👥 Gestion du cache des stats utilisateurs
     */
    getUserStats(userIds) {
        const key = `${this.KEYS.USER_STATS}_${userIds.sort().join("_")}`;
        return this.get(key);
    }
    setUserStats(userIds, stats) {
        const key = `${this.KEYS.USER_STATS}_${userIds.sort().join("_")}`;
        return this.set(key, stats, this.TTL.USER_STATS);
    }
    invalidateUserStats() {
        this.invalidateByPrefix(this.KEYS.USER_STATS);
    }
    // === MÉTHODES UTILITAIRES ===
    /**
     * Invalide toutes les clés commençant par un préfixe
     */
    invalidateByPrefix(prefix) {
        const keys = this.cache.keys();
        keys.forEach((key) => {
            if (key.startsWith(prefix)) {
                this.del(key);
            }
        });
    }
    /**
     * 📊 Statistiques détaillées du cache
     */
    getStats() {
        const stats = this.cache.getStats();
        const hitRate = stats.hits + stats.misses > 0
            ? (stats.hits / (stats.hits + stats.misses)) * 100
            : 0;
        return {
            keys: this.cache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
            ksize: stats.ksize,
            vsize: stats.vsize,
            hitRate: hitRate.toFixed(2),
            hitRateNumeric: hitRate, // Pour les comparaisons numériques
        };
    }
    /**
     * 🧹 Nettoyage avancé du cache avec sélectivité
     */
    cleanupExpired() {
        const beforeKeys = this.cache.keys().length;
        // Le nettoyage automatique est géré par node-cache
        const afterKeys = this.cache.keys().length;
        return beforeKeys - afterKeys;
    }
}
// Export singleton
exports.cacheService = new CacheService();
exports.default = CacheService;
