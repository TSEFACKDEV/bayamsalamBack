
import express, { Application, Request, Response } from 'express';
import env from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from "express-fileupload";
import { errorHandler } from './middlewares/errorHandler.js';
import Router from "./routes/index.js"
import url from 'node:url';
import path from 'node:path';
const app: Application = express();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(path.dirname(import.meta.url));

//Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true
  }));
// Static files
app.use("/public", express.static(path.join(__dirname, "../public")));


//Routes
app.use("/api/bayamsalam",Router)

// Health check
app.get('/api/bayamsalam', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Gestion des erreurs
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running on http://${env.host}:${env.port}`);
});