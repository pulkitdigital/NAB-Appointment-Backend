// Backend/server.js - COMPLETE VERSION WITH HOURLY REMINDER SCHEDULER
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase.js';
import bookingRoutes from './routes/booking.routes.js';
import adminRoutes from './routes/admin.routes.js';
// ✅ Import hourly reminder scheduler
import reminderScheduler from './services/reminderScheduler.service.js';

// ✅ Load environment variables FIRST
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ✅ Test route for reminder emails
app.get('/test-reminder', async (req, res) => {
  try {
    await reminderScheduler.testReminders();
    res.json({ 
      success: true, 
      message: 'Test reminder check completed. Check server logs for details.' 
    });
  } catch (error) {
    console.error('❌ Test reminder error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// API Routes
app.use('/api/booking', bookingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // ✅ Start hourly reminder scheduler
  try {
    reminderScheduler.start();
  } catch (error) {
    console.error('❌ Failed to start reminder scheduler:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;