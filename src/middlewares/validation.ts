import { NextFunction, Request, Response } from "express";
import * as yup from "yup";
const validate =
  (schema: yup.ObjectSchema<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body);
      next();
    } catch (err: any) {
      // En mode développement, logguer les erreurs de validation pour debug
      if (process.env.NODE_ENV === "development") {
        console.log("❌ Erreur de validation Yup:", err.message);
        console.log("📄 Champ en erreur:", err.path);
      }
      res.status(400).json({ error: err.errors });
    }
  };

export default validate;
