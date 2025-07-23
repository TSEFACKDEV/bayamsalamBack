import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { UploadedFile } from 'express-fileupload';

/**
 * Valide et upload les images d'un produit
 * @param req Requête Express
 * @returns Promise résolue avec les noms des fichiers uploadés
 * @throws Error si la validation échoue
 */
export const uploadProductImages = async (req: Request): Promise<string[]> => {
  if (!req.files || !req.files.images) {
    throw new Error('Au moins une image est requise');
  }

  let images: UploadedFile | UploadedFile[];
  if (Array.isArray(req.files.images)) {
    images = req.files.images;
  } else {
    images = [req.files.images];
  }

  // Validation du nombre d'images
  if (images.length < 1 || images.length > 5) {
    throw new Error('Un produit doit avoir entre 1 et 5 images');
  }

  // Créer le dossier d'upload s'il n'existe pas
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uploadedFiles: string[] = [];

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
    const ext = path.extname(image.name);
    const uniqueName = `product_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Déplacer le fichier
    await image.mv(filePath);
    uploadedFiles.push(uniqueName);
  }

  return uploadedFiles;
};

/**
 * Supprime les fichiers images du serveur
 * @param filenames Noms des fichiers à supprimer
 */
export const deleteProductImages = (filenames: string[]) => {
  const uploadDir = path.join(__dirname, '../../public/uploads');
  
  filenames.forEach(filename => {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};