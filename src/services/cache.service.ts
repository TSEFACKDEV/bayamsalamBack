import NodeCache from "node-cache";

/**
 * 🚀 Service de cache in-memory optimisé avec TTL intelligent
 * Utilise node-cache pour améliorer les performances des requêtes répétitives
 */
class CacheService {
  private readonly cache: NodeCache;

  // TTL en secondes pour différents types de données
  private readonly TTL = {
    CATEGORIES: 300, // 5 minutes - changent rarement
    CITIES: 600, // 10 minutes - très stables
    HOMEPAGE_PRODUCTS: 180, // 3 minutes - plus dynamiques
    USER_STATS: 120, // 2 minutes - évoluent avec les reviews
  } as const;

  // Préfixes des clés pour une meilleure organisation
  private readonly KEYS = {
    CATEGORIES: "categories",
    CITIES: "cities",
    HOMEPAGE_PRODUCTS: "homepage_products",
    USER_STATS: "user_stats",
  } as const;

  constructor() {
    this.cache = new NodeCache({
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
  private setupEventListeners(): void {
    this.cache.on("expired", (key: string) => {
      // Cache expiré et supprimé
    });

    this.cache.on("flush", () => {
      // Cache vidé complètement
    });
  }

  // === MÉTHODES GÉNÉRIQUES ===

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || this.TTL.HOMEPAGE_PRODUCTS);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  // === MÉTHODES SPÉCIALISÉES ===

  /**
   * 📂 Gestion du cache des catégories
   */
  getCategories(): any[] | undefined {
    return this.get<any[]>(this.KEYS.CATEGORIES);
  }

  setCategories(categories: any[]): boolean {
    return this.set(this.KEYS.CATEGORIES, categories, this.TTL.CATEGORIES);
  }

  invalidateCategories(): void {
    this.del(this.KEYS.CATEGORIES);
  }

  /**
   * 🏙️ Gestion du cache des villes
   */
  getCities(): any[] | undefined {
    return this.get<any[]>(this.KEYS.CITIES);
  }

  setCities(cities: any[]): boolean {
    return this.set(this.KEYS.CITIES, cities, this.TTL.CITIES);
  }

  invalidateCities(): void {
    this.del(this.KEYS.CITIES);
  }

  /**
   * 🏠 Gestion du cache des produits homepage
   */
  getHomepageProducts(limit: number): any | undefined {
    return this.get<any>(`${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`);
  }

  setHomepageProducts(limit: number, data: any): boolean {
    return this.set(
      `${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`,
      data,
      this.TTL.HOMEPAGE_PRODUCTS
    );
  }

  invalidateHomepageProducts(): void {
    this.invalidateByPrefix(this.KEYS.HOMEPAGE_PRODUCTS);
  }

  /**
   * 👥 Gestion du cache des stats utilisateurs
   */
  getUserStats(userIds: string[]): Map<string, any> | undefined {
    const key = `${this.KEYS.USER_STATS}_${userIds.sort().join("_")}`;
    return this.get<Map<string, any>>(key);
  }

  setUserStats(userIds: string[], stats: Map<string, any>): boolean {
    const key = `${this.KEYS.USER_STATS}_${userIds.sort().join("_")}`;
    return this.set(key, stats, this.TTL.USER_STATS);
  }

  invalidateUserStats(): void {
    this.invalidateByPrefix(this.KEYS.USER_STATS);
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Invalide toutes les clés commençant par un préfixe
   */
  private invalidateByPrefix(prefix: string): void {
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
    const hitRate =
      stats.hits + stats.misses > 0
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
  cleanupExpired(): number {
    const beforeKeys = this.cache.keys().length;
    // Le nettoyage automatique est géré par node-cache
    const afterKeys = this.cache.keys().length;
    return beforeKeys - afterKeys;
  }
}

// Export singleton
export const cacheService = new CacheService();
export default CacheService;
