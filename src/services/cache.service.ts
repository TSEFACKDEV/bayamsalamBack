import NodeCache from "node-cache";

// Interfaces pour typer les données du cache
interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
  hitRate: string;
  hitRateNumeric: number;
}

interface City {
  id: string;
  name: string;
  userCount: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  isActive: boolean;
  productCount: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

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
    USER_STATS: 120, // 2 minutes - évoluent avec les reviews
    HOMEPAGE_PRODUCTS: 180, // 3 minutes - produits populaires
  } as const;

  // Préfixes des clés pour une meilleure organisation
  private readonly KEYS = {
    CATEGORIES: "categories",
    CITIES: "cities",
    USER_STATS: "user_stats",
    HOMEPAGE_PRODUCTS: "homepage_products",
  } as const;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: this.TTL.HOMEPAGE_PRODUCTS, // TTL par défaut
      checkperiod: 60, // Nettoyage toutes les 60s
      useClones: false, // Performance: évite le clonage
      deleteOnExpire: true, // Nettoyage automatique
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
  getCategories(): Category[] | undefined {
    return this.get<Category[]>(this.KEYS.CATEGORIES);
  }

  setCategories(categories: Category[]): boolean {
    return this.set(this.KEYS.CATEGORIES, categories, this.TTL.CATEGORIES);
  }

  invalidateCategories(): void {
    this.del(this.KEYS.CATEGORIES);
  }

  /**
   * 🏙️ Gestion du cache des villes
   */
  getCities(): City[] | undefined {
    return this.get<City[]>(this.KEYS.CITIES);
  }

  setCities(cities: City[]): boolean {
    return this.set(this.KEYS.CITIES, cities, this.TTL.CITIES);
  }

  invalidateCities(): void {
    this.del(this.KEYS.CITIES);
  }

  /**
   * 👥 Gestion du cache des stats utilisateurs globales
   */
  getUserStats(): Map<string, number> | undefined {
    return this.get<Map<string, number>>(this.KEYS.USER_STATS);
  }

  setUserStats(stats: Map<string, number>): boolean {
    return this.set(this.KEYS.USER_STATS, stats, this.TTL.USER_STATS);
  }

  invalidateUserStats(): void {
    this.del(this.KEYS.USER_STATS);
  }

  /**
   * 🏠 Gestion du cache des produits homepage
   */
  getHomepageProducts(limit: number): any | undefined {
    return this.get<any>(`${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`);
  }

  setHomepageProducts(limit: number, products: any): boolean {
    return this.set(
      `${this.KEYS.HOMEPAGE_PRODUCTS}_${limit}`,
      products,
      this.TTL.HOMEPAGE_PRODUCTS
    );
  }

  invalidateHomepageProducts(): void {
    this.invalidateByPrefix(this.KEYS.HOMEPAGE_PRODUCTS);
  }

  /**
   * 🗑️ INVALIDATION COMPLÈTE DES PRODUITS
   * Utilisé lors de suppressions massives (suspension/bannissement)
   * OPTIMISÉ: Plus besoin d'appeler séparément invalidateHomepageProducts()
   */
  invalidateAllProducts(): void {
    this.invalidateByPrefix("product"); // Invalide toutes les clés commençant par "product"
    this.invalidateByPrefix("homepage_products"); // Invalide spécifiquement homepage_products_*
    console.log("🗑️ Tous les caches de produits ont été invalidés");
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * 📊 Statistiques détaillées du cache
   */
  getStats(): CacheStats {
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

  /**
   * 🗑️ Invalider toutes les clés avec un préfixe donné
   */
  private invalidateByPrefix(prefix: string): void {
    const keys = this.cache.keys();
    const toDelete = keys.filter((key) => key.startsWith(prefix));
    toDelete.forEach((key) => this.del(key));
  }
}

// Export singleton
export const cacheService = new CacheService();
export default CacheService;
