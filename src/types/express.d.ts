import { User as ModelUser } from "@prisma/client";


declare global {
  namespace Express {
    interface Request {
      authUser?: ModelUser; // Utiliser authUser au lieu de user
      user?: any; // Ajouter cette ligne pour Passport.js
    }
  }
}