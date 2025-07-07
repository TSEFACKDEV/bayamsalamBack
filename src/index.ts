import express, { Application, Request, Response } from 'express';
import env from './config/config';
import morgan from 'morgan';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import Router from "./routes/index"
const app: Application = express();

//Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

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