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
/**
 * Valide et upload les images d'un produit
 * @param req Requête Express
 * @returns Promise résolue avec les noms des fichiers uploadés
 * @throws Error si la validation échoue
 */
const uploadProductImages = (req) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files || !req.files.images) {
        throw new Error('Au moins une image est requise');
    }
    let images;
    if (Array.isArray(req.files.images)) {
        images = req.files.images;
    }
    else {
        images = [req.files.images];
    }
    // Validation du nombre d'images
    if (images.length < 1 || images.length > 5) {
        throw new Error('Un produit doit avoir entre 1 et 5 images');
    }
    // Créer le dossier d'upload s'il n'existe pas
    const uploadDir = path_1.default.join(__dirname, '../../public/uploads');
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const uploadedFiles = [];
    // Traiter chaque image
    for (const image of images) {
        // Validation du type MIME
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validMimeTypes.includes(image.mimetype)) {
            throw new Error(`Type de fichier non supporté: ${image.mimetype}`);
        }
        // Validation de la taille (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (image.size > maxSize) {
            throw new Error(`L'image ${image.name} dépasse la taille maximale de 5MB`);
        }
        // Générer un nom de fichier unique
        const ext = path_1.default.extname(image.name);
        const uniqueName = `product_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
        const filePath = path_1.default.join(uploadDir, uniqueName);
        // Déplacer le fichier
        yield image.mv(filePath);
        uploadedFiles.push(uniqueName);
    }
    return uploadedFiles;
});
exports.uploadProductImages = uploadProductImages;
/**
 * Supprime les fichiers images du serveur
 * @param filenames Noms des fichiers à supprimer
 */
const deleteProductImages = (filenames) => {
    const uploadDir = path_1.default.join(__dirname, '../../public/uploads');
    filenames.forEach(filename => {
        const filePath = path_1.default.join(uploadDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    });
};
exports.deleteProductImages = deleteProductImages;
