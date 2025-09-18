import path from "path";
import fs from "fs";
import sharp from "sharp";
import { Request } from "express";
import { UploadedFile } from "express-fileupload";

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
} as const;

/**
 * Valide et upload les images d'un produit avec compression automatique WebP
 * @param req Requête Express
 * @returns Promise résolue avec les noms des fichiers uploadés (optimisés)
 * @throws Error si la validation échoue
 */
export const uploadProductImages = async (req: Request): Promise<string[]> => {
  // Validation de base
  if (!req.files?.images) {
    throw new Error("Au moins une image est requise");
  }

  // Normalisation: toujours travailler avec un array
  const images = Array.isArray(req.files.images)
    ? req.files.images
    : [req.files.images];

  // Validation du nombre d'images
  if (
    images.length < IMAGE_CONFIG.MIN_IMAGES ||
    images.length > IMAGE_CONFIG.MAX_IMAGES
  ) {
    throw new Error(
      `Un produit doit avoir entre ${IMAGE_CONFIG.MIN_IMAGES} et ${IMAGE_CONFIG.MAX_IMAGES} images`
    );
  }

  // Créer le dossier d'upload s'il n'existe pas
  const uploadDir = path.join(__dirname, "../../public/uploads/products");
  await ensureDirectoryExists(uploadDir);

  const uploadedFiles: string[] = [];

  // Traitement séquentiel des images pour éviter la surcharge mémoire
  for (const [index, image] of images.entries()) {
    try {
      const filename = await processImage(image, uploadDir, index);
      uploadedFiles.push(filename);
    } catch (error) {
      console.error(`❌ Erreur traitement image ${index + 1}:`, error);
      // Essayer avec le fallback
      const fallbackFilename = await processImageFallback(
        image,
        uploadDir,
        index
      );
      uploadedFiles.push(fallbackFilename);
    }
  }

  return uploadedFiles;
};

/**
 * Traite une image avec optimisation WebP
 */
async function processImage(
  image: UploadedFile,
  uploadDir: string,
  index: number
): Promise<string> {
  // Validation
  validateImage(image);

  // Génération du nom de fichier unique
  const uniqueName = generateUniqueFilename(index, ".webp");
  const filePath = path.join(uploadDir, uniqueName);

  // Optimisation avec Sharp
  await sharp(image.data)
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
}

/**
 * Fallback: traitement sans optimisation en cas d'erreur
 */
async function processImageFallback(
  image: UploadedFile,
  uploadDir: string,
  index: number
): Promise<string> {
  validateImage(image);

  const ext = path.extname(image.name);
  const uniqueName = generateUniqueFilename(index, ext);
  const filePath = path.join(uploadDir, uniqueName);

  await image.mv(filePath);
  // Image sauvegardée sans optimisation
  return `/uploads/products/${uniqueName}`;
}

/**
 * Validation d'une image
 */
function validateImage(image: UploadedFile): void {
  // Type MIME
  if (
    !(IMAGE_CONFIG.VALID_MIME_TYPES as readonly string[]).includes(
      image.mimetype
    )
  ) {
    throw new Error(`Type de fichier non supporté: ${image.mimetype}`);
  }

  // Taille
  if (image.size > IMAGE_CONFIG.MAX_SIZE) {
    throw new Error(
      `L'image ${image.name} dépasse la taille maximale de ${
        IMAGE_CONFIG.MAX_SIZE / 1024 / 1024
      }MB`
    );
  }
}

/**
 * Génère un nom de fichier unique
 */
function generateUniqueFilename(index: number, extension: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `product_${timestamp}_${index}_${random}${extension}`;
}

/**
 * S'assure que le dossier existe
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Supprime les fichiers images du serveur de manière sécurisée
 * @param filenames Noms des fichiers à supprimer
 */
export const deleteProductImages = (filenames: string[]): void => {
  const uploadDir = path.join(__dirname, "../../public/uploads");

  filenames.forEach((filename) => {
    try {
      const filePath = path.join(uploadDir, filename);

      // Vérification de sécurité: le fichier doit être dans le dossier uploads
      if (!filePath.startsWith(uploadDir)) {
        console.error(
          `🚨 Tentative de suppression en dehors du dossier autorisé: ${filename}`
        );
        return;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // Image supprimée avec succès
      }
    } catch (error) {
      console.error(`❌ Erreur suppression ${filename}:`, error);
    }
  });
};
