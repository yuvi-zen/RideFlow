/**
 * app.js - Express application setup
 */

const express = require('express');
const apiRoutes = require('./routes/api');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ==================== MIDDLEWARE ====================

// CORS - Allow frontend to make requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (optional)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'RideFlow API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', apiRoutes);

// ==================== ERROR HANDLING ====================

// 404 Not Found
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
