import express, { Application, Request, Response } from "express";
import env from "./config/config.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import session from "express-session";
import helmet from "helmet";
import http from "http";
import passport from "passport";
import url from "node:url";
import path from "node:path";

import { errorHandler } from "./middlewares/errorHandler.js";
import { validateContentType } from "./middlewares/contentTypeValidator.js";
import { generalRateLimiter } from "./middlewares/rateLimiter.js";
import { SecurityUtils } from "./utilities/security.utils.js";
import { initSockets } from "./utilities/socket.js";
import Router from "./routes/index.js";
import prisma from "./model/prisma.client.js";
import { hashPassword } from "./utilities/bcrypt.js";
import { ForfaitSchedulerService } from "./services/forfaitScheduler.service.js";
import "./config/passport.config.js";

SecurityUtils.runSecurityAudit();

const app: Application = express();

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.nodeEnv === "production" ? [] : null,
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts:
      env.nodeEnv === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    hidePoweredBy: true,
    xssFilter: true,
  })
);

//Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Session configuration
app.use(
  session({
    secret: env.sessionSecret || "buyandsale-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    name: "buyandsale.sid",
    cookie: {
      secure: env.nodeEnv === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
    },
    genid: () => {
      return require("crypto").randomBytes(16).toString("hex");
    },
  })
);

app.use(cookieParser());
app.use(morgan("dev"));
app.use(validateContentType());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
  })
);

app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/api/bayamsalam", generalRateLimiter);

// Routes
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/bayamsalam", Router);

// Health check
app.get("/api/bayamsalam", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use(errorHandler);

const server = http.createServer(app);
initSockets(server);

server.listen(env.port, () => {
  console.log(`Server is running on http://${env.host}:${env.port}`);

  // 🚀 Démarrage du service de surveillance des forfaits
  ForfaitSchedulerService.start();
});
