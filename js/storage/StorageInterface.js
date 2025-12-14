/**
 * MapyEditor - Storage Interface
 * Abstract interface for route persistence
 * Implementations: GpxStorage, ApiStorage (future)
 */

/**
 * Abstract storage interface
 * All storage implementations must extend this class
 */
export class StorageInterface {
    /**
     * Load all routes
     * @param {Object} options - Load options
     * @param {boolean} options.metadataOnly - If true, load only metadata (id, name, color)
     * @returns {Promise<Array>} Array of route objects
     */
    async loadAll(options = {}) {
        throw new Error('StorageInterface.loadAll() must be implemented');
    }
    
    /**
     * Save all routes
     * @param {Array} routes - Array of route objects
     * @returns {Promise<boolean>} Success status
     */
    async saveAll(routes) {
        throw new Error('StorageInterface.saveAll() must be implemented');
    }
    
    /**
     * Load a single route by ID
     * @param {number|string} routeId - Route ID
     * @returns {Promise<Object|null>} Route object or null
     */
    async loadRoute(routeId) {
        throw new Error('StorageInterface.loadRoute() must be implemented');
    }
    
    /**
     * Save a single route
     * @param {Object} route - Route object
     * @returns {Promise<Object|null>} Saved route or null
     */
    async saveRoute(route) {
        throw new Error('StorageInterface.saveRoute() must be implemented');
    }
    
    /**
     * Delete a single route
     * @param {number|string} routeId - Route ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteRoute(routeId) {
        throw new Error('StorageInterface.deleteRoute() must be implemented');
    }
    
    /**
     * Check if storage supports individual route operations
     * @returns {boolean}
     */
    supportsIndividualOperations() {
        return false;
    }
    
    /**
     * Get storage type identifier
     * @returns {string}
     */
    getType() {
        return 'unknown';
    }
}


