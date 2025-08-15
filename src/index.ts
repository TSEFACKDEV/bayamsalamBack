import express, { Application, Request, Response } from "express";
import env from "./config/config.js";
import morgan from "morgan";
import cors from "cors";
import fileUpload from "express-fileupload";
import { errorHandler } from "./middlewares/errorHandler.js";
import Router from "./routes/index.js";
import url from "node:url";
import path from "node:path";
import prisma from "./model/prisma.client.js"; // adapte le chemin si besoin
import { hashPassword } from "./utilities/bcrypt.js"; // adapte le chemin si besoin

const app: Application = express();

//Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true,
  })
);
// Static files
app.use("/public", express.static(path.join(__dirname, "../public")));

//Routes
console.log("Mounting /api/bayamsalam routes");
app.use("/api/bayamsalam", Router);

// Health check
app.get("/api/bayamsalam", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

//creation des admins
async function createSuperAdmin() {
  const email = "tsefackcalvinklein@gmail.com";
  try {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
    });
    if (!superAdminRole) {
      console.error(
        "Le rôle SUPER_ADMIN n'existe pas. Veuillez lancer le seed d'abord."
      );
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: "super admin",
          lastName: "BuyamSale",
          email,
          password: await hashPassword("BuyamSale"),
          isVerified: true,
          phone: "B",
          status: "ACTIVE",
        },
      });
      console.log("Super admin créé avec succès !");
    } else {
      console.log("Le super admin existe déjà.");
    }

    // Assigner le rôle SUPER_ADMIN si ce n'est pas déjà fait
    const alreadyAssigned = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
    });
    if (!alreadyAssigned) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
      console.log("Rôle SUPER_ADMIN assigné au super admin.");
    } else {
      console.log("Le super admin a déjà le rôle SUPER_ADMIN.");
    }
  } catch (error) {
    console.error("Erreur lors de la création du super admin :", error);
  }
}

// Appeler la fonction au démarrage
createSuperAdmin().catch(console.error);

// Gestion des erreurs
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running on http://${env.host}:${env.port}`);
});
