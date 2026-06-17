/**
 * api.js - Main API router
 * Combines all module routes
 */

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const driverRoutes = require('./driverRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const rideRoutes = require('./rideRoutes');
const paymentRoutes = require('./paymentRoutes');
const ratingRoutes = require('./ratingRoutes');
const complaintRoutes = require('./complaintRoutes');
const reportRoutes = require('./reportRoutes');
const locationRoutes = require('./locationRoutes');
const healthController = require('../controllers/healthController');

const router = express.Router();

// Health check endpoint
router.get('/health', healthController.healthCheck);

// Authentication routes (public + authenticated)
router.use('/auth', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Driver management routes
router.use('/drivers', driverRoutes);

// Vehicle management routes
router.use('/vehicles', vehicleRoutes);

// Ride management routes
router.use('/rides', rideRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Rating routes
router.use('/ratings', ratingRoutes);

// Complaint routes
router.use('/complaints', complaintRoutes);

// Admin report routes
router.use('/reports', reportRoutes);

// Location routes
router.use('/locations', locationRoutes);

module.exports = router;
