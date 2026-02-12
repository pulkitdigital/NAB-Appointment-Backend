// Backend/routes/admin.routes.js
import express from 'express';
import {
  getDashboard,
  getAppointments,
  updateStatus,
  assignCA,
  getCAs,
  createCA,
  updateCA,
  deleteCA,
  getSystemSettings,
  updateSystemSettings,
  addOffDay,
  removeOffDay,
} from '../controllers/admin.controller.js';
import { verifyAdmin } from '../middlewares/adminSecret.js';

const router = express.Router();

// ✅ Apply admin verification to all routes
router.use(verifyAdmin);

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', getDashboard);

// ==================== APPOINTMENTS ====================
router.get('/appointments', getAppointments);
router.patch('/appointments/:appointmentId/status', updateStatus);
router.patch('/appointments/:appointmentId/assign', assignCA);

// ==================== CA MANAGEMENT ====================
router.get('/ca/list', getCAs);
router.post('/ca/create', createCA);
router.patch('/ca/:caId', updateCA);
router.delete('/ca/:caId', deleteCA);

// ==================== SETTINGS ====================
router.get('/settings', getSystemSettings);
router.patch('/settings', updateSystemSettings);
router.post('/settings/off-day', addOffDay);
router.delete('/settings/off-day', removeOffDay);

export default router;