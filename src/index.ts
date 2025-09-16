import express, { Application, Request, Response } from "express";
import env from "./config/config.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import session from "express-session";
import MongoStore from "connect-mongo";
import { errorHandler } from "./middlewares/errorHandler.js";
import Router from "./routes/index.js";
import url from "node:url";
import path from "node:path";
import prisma from "./model/prisma.client.js"; // adapte le chemin si besoin
import { hashPassword } from "./utilities/bcrypt.js"; // adapte le chemin si besoin
import http from "http";
import { initSockets } from "./utilities/socket.js";
import passport from "passport";
import "./config/passport.config.js";
const app: Application = express();

//Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ], // Frontend URLs autorisées
    credentials: true, // Permet l'envoi des cookies/credentials
    optionsSuccessStatus: 200, // Support legacy browsers
  })
);

// Configuration de session sécurisée
app.use(
  session({
    secret: env.sessionSecret || "bayamsalam-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    name: "bayamsalam.sid", // Nom de session unique
    cookie: {
      secure: env.nodeEnv === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
    },
    // Génération d'ID de session unique pour éviter les conflits
    genid: () => {
      return require("crypto").randomBytes(16).toString("hex");
    },
  })
);

app.use(cookieParser()); // ✅ Middleware pour parser les cookies
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
app.use(passport.initialize());
app.use(passport.session()); // Ajouter le support des sessions pour Passport
app.use("/api/bayamsalam", Router);

// Health check
app.get("/api/bayamsalam", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Gestion des erreurs
app.use(errorHandler);

// Remplace app.listen par http server + initSockets
const server = http.createServer(app);
initSockets(server);

server.listen(env.port, () => {
  console.log(`Server is running on http://${env.host}:${env.port}`);
});
