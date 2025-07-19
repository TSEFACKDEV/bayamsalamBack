import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Définir le dossier de destination pour les images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/products'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

// Filtrer les fichiers pour n'accepter que les images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Limite à 5 fichiers maximum
export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: { files: 5, fileSize: 5 * 1024 * 1024 }, // 5 fichiers, 5MB chacun max
});
