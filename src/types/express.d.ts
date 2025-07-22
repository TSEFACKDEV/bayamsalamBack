import { User } from "../../model/User.type"; // adapte ce chemin selon ton projet

declare global {
  namespace Express {
    interface Request {
      user?: User; // ou adapte le type selon ta structure utilisateur
    }
  }
}