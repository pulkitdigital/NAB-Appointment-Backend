//backend/routes/auth.routes.js

import express from 'express';
import { loginAdmin, verifyAdmin, getAdminProfile } from '../controllers/auth.controller.js';
import verifyToken from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/auth/login - ✅ Login route
router.post('/login', loginAdmin);

// POST /api/auth/verify-admin
router.post('/verify-admin', verifyAdmin);

// GET /api/auth/profile (protected)
router.get('/profile', verifyToken, getAdminProfile);

export default router;