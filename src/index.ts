import express, { Application, Request, Response } from "express";
import env from "./config/config.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
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
