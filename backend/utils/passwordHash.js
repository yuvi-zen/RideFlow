/**
 * passwordHash.js - Password hashing and verification utilities
 */

const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config/env');

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        return hash;
    } catch (error) {
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        throw new Error('Password verification failed');
    }
}

module.exports = {
    hashPassword,
    verifyPassword
};
