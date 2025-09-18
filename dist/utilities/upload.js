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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductImages = exports.uploadProductImages = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
/**
 * 🖼️ Configuration pour l'optimisation d'images
 */
const IMAGE_CONFIG = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB avant compression
    MAX_DIMENSION: 800, // Redimensionnement max
    WEBP_QUALITY: 85, // Qualité WebP optimale
    COMPRESSION_EFFORT: 6, // Niveau de compression
    VALID_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
    MIN_IMAGES: 1,
    MAX_IMAGES: 5,
};
/**
 * Valide et upload les images d'un produit avec compression automatique WebP
 * @param req Requête Express
 * @returns Promise résolue avec les noms des fichiers uploadés (optimisés)
 * @throws Error si la validation échoue
 */
const uploadProductImages = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validation de base
    if (!((_a = req.files) === null || _a === void 0 ? void 0 : _a.images)) {
        throw new Error("Au moins une image est requise");
    }
    // Normalisation: toujours travailler avec un array
    const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
    // Validation du nombre d'images
    if (images.length < IMAGE_CONFIG.MIN_IMAGES ||
        images.length > IMAGE_CONFIG.MAX_IMAGES) {
        throw new Error(`Un produit doit avoir entre ${IMAGE_CONFIG.MIN_IMAGES} et ${IMAGE_CONFIG.MAX_IMAGES} images`);
    }
    // Créer le dossier d'upload s'il n'existe pas
    const uploadDir = path_1.default.join(__dirname, "../../public/uploads/products");
    yield ensureDirectoryExists(uploadDir);
    const uploadedFiles = [];
    // Traitement séquentiel des images pour éviter la surcharge mémoire
    for (const [index, image] of images.entries()) {
        try {
            const filename = yield processImage(image, uploadDir, index);
            uploadedFiles.push(filename);
        }
        catch (error) {
            console.error(`❌ Erreur traitement image ${index + 1}:`, error);
            // Essayer avec le fallback
            const fallbackFilename = yield processImageFallback(image, uploadDir, index);
            uploadedFiles.push(fallbackFilename);
        }
    }
    return uploadedFiles;
});
exports.uploadProductImages = uploadProductImages;
/**
 * Traite une image avec optimisation WebP
 */
function processImage(image, uploadDir, index) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validation
        validateImage(image);
        // Génération du nom de fichier unique
        const uniqueName = generateUniqueFilename(index, ".webp");
        const filePath = path_1.default.join(uploadDir, uniqueName);
        // Optimisation avec Sharp
        yield (0, sharp_1.default)(image.data)
            .resize(IMAGE_CONFIG.MAX_DIMENSION, IMAGE_CONFIG.MAX_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
        })
            .webp({
            quality: IMAGE_CONFIG.WEBP_QUALITY,
            effort: IMAGE_CONFIG.COMPRESSION_EFFORT,
        })
            .toFile(filePath);
        // Image optimisée avec succès
        return `/uploads/products/${uniqueName}`;
    });
}
/**
 * Fallback: traitement sans optimisation en cas d'erreur
 */
function processImageFallback(image, uploadDir, index) {
    return __awaiter(this, void 0, void 0, function* () {
        validateImage(image);
        const ext = path_1.default.extname(image.name);
        const uniqueName = generateUniqueFilename(index, ext);
        const filePath = path_1.default.join(uploadDir, uniqueName);
        yield image.mv(filePath);
        // Image sauvegardée sans optimisation
        return `/uploads/products/${uniqueName}`;
    });
}
/**
 * Validation d'une image
 */
function validateImage(image) {
    // Type MIME
    if (!IMAGE_CONFIG.VALID_MIME_TYPES.includes(image.mimetype)) {
        throw new Error(`Type de fichier non supporté: ${image.mimetype}`);
    }
    // Taille
    if (image.size > IMAGE_CONFIG.MAX_SIZE) {
        throw new Error(`L'image ${image.name} dépasse la taille maximale de ${IMAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB`);
    }
}
/**
 * Génère un nom de fichier unique
 */
function generateUniqueFilename(index, extension) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `product_${timestamp}_${index}_${random}${extension}`;
}
/**
 * S'assure que le dossier existe
 */
function ensureDirectoryExists(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
        }
    });
}
/**
 * Supprime les fichiers images du serveur de manière sécurisée
 * @param filenames Noms des fichiers à supprimer
 */
const deleteProductImages = (filenames) => {
    const uploadDir = path_1.default.join(__dirname, "../../public/uploads");
    filenames.forEach((filename) => {
        try {
            const filePath = path_1.default.join(uploadDir, filename);
            // Vérification de sécurité: le fichier doit être dans le dossier uploads
            if (!filePath.startsWith(uploadDir)) {
                console.error(`🚨 Tentative de suppression en dehors du dossier autorisé: ${filename}`);
                return;
            }
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                // Image supprimée avec succès
            }
        }
        catch (error) {
            console.error(`❌ Erreur suppression ${filename}:`, error);
        }
    });
};
exports.deleteProductImages = deleteProductImages;
