import express from 'express';
import env from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from "express-fileupload";
import { errorHandler } from './middlewares/errorHandler.js';
import Router from "./routes/index.js";
const app = express();
//Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use("/uploads/products", express.static("uploads/products"));
//Routes
app.use("/api/bayamsalam", Router);
// Health check
app.get('/api/bayamsalam', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});
// Gestion des erreurs
app.use(errorHandler);
app.listen(env.port, () => {
    console.log(`Server is running on http://${env.host}:${env.port}`);
});
