/**
 * jwt.js - JWT token management utilities
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/env');

/**
 * Generate JWT token
 * @param {Object} payload - User data to encode (id, email, role)
 * @returns {string} JWT token
 */
function generateToken(payload) {
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRY,
            algorithm: 'HS256'
        });
        return token;
    } catch (error) {
        throw new Error('Token generation failed');
    }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
    try {
        if (!token) {
            throw new Error('No token provided');
        }

        // Remove "Bearer " prefix if present
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        const decoded = jwt.verify(cleanToken, JWT_SECRET, {
            algorithms: ['HS256']
        });
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

/**
 * Decode token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
    try {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        return jwt.decode(cleanToken);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken,
    decodeToken
};
