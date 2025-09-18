import express from 'express';
import {
  getAllReports,
  getReportById,
  processReport,
  getReportsStatistics,
} from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import checkPermission from '../middlewares/checkPermission.js';

const router = express.Router();

router.use(authenticate);

// Routes pour la gestion des signalements (Admin seulement)
router.get('/', checkPermission('REPORT_VIEW_ALL'), getAllReports);
router.get(
  '/statistics',
  checkPermission('REPORT_VIEW_ALL'),
  getReportsStatistics
);
router.get('/:id', checkPermission('REPORT_VIEW'), getReportById);
router.put('/:id/process', checkPermission('REPORT_PROCESS'), processReport);

export default router;
