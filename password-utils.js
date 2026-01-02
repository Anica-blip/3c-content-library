/**
 * Password Utilities for Private Folder Access
 * Simple password generation and validation
 */

const PasswordUtils = {
    /**
     * Generate a random password
     * @param {number} length - Password length (default: 12)
     * @returns {string} Generated password
     */
    generatePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one of each type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
        password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special
        
        // Fill the rest
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    },

    /**
     * Simple hash function (for demo - use bcrypt in production)
     * @param {string} password - Plain text password
     * @returns {string} Hashed password
     */
    async hashPassword(password) {
        // For demo purposes, we'll use a simple hash
        // In production, use bcrypt or similar on the server side
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Verify password against hash
     * @param {string} password - Plain text password to verify
     * @param {string} hash - Stored hash
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, hash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === hash;
    },

    /**
     * Store password access in session
     * @param {string} folderId - Folder ID
     */
    grantAccess(folderId) {
        const accessList = JSON.parse(sessionStorage.getItem('folderAccess') || '[]');
        if (!accessList.includes(folderId)) {
            accessList.push(folderId);
            sessionStorage.setItem('folderAccess', JSON.stringify(accessList));
        }
    },

    /**
     * Check if user has access to folder
     * @param {string} folderId - Folder ID
     * @returns {boolean} True if user has access
     */
    hasAccess(folderId) {
        const accessList = JSON.parse(sessionStorage.getItem('folderAccess') || '[]');
        return accessList.includes(folderId);
    },

    /**
     * Clear all folder access
     */
    clearAccess() {
        sessionStorage.removeItem('folderAccess');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordUtils;
}
