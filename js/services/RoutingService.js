/**
 * MapyEditor - Routing Service
 * Handles communication with Mapy.cz routing API
 */

import { CONFIG } from '../config.js';

/**
 * Service for calculating routes via Mapy.cz API
 */
class RoutingService {
    constructor() {
        this._loading = false;
        this._onLoadingChange = null;
    }
    
    /**
     * Set loading state change callback
     * @param {Function} callback - Function to call when loading state changes
     */
    setLoadingCallback(callback) {
        this._onLoadingChange = callback;
    }
    
    /**
     * Get current loading state
     */
    get isLoading() {
        return this._loading;
    }
    
    /**
     * Set loading state
     * @private
     */
    _setLoading(loading) {
        this._loading = loading;
        if (this._onLoadingChange) {
            this._onLoadingChange(loading);
        }
    }
    
    /**
     * Calculate route between two points with optional via waypoints
     * @param {Object} start - Start point {lat, lon}
     * @param {Object} end - End point {lat, lon}
     * @param {Array} viaPoints - Array of intermediate waypoints [{lat, lon}, ...]
     * @returns {Promise<Array|null>} Array of coordinates [{lat, lon}, ...] or null on error
     */
    async calculateRoute(start, end, viaPoints = []) {
        this._setLoading(true);
        
        try {
            const url = new URL('https://api.mapy.com/v1/routing/route');
            url.searchParams.set('apikey', CONFIG.API_KEY);
            url.searchParams.set('start', `${start.lon},${start.lat}`);
            url.searchParams.set('end', `${end.lon},${end.lat}`);
            url.searchParams.set('routeType', CONFIG.ROUTE_TYPE);
            url.searchParams.set('format', 'geojson');
            
            // Add via waypoints (max 15 per API call including start/end)
            if (viaPoints.length > 0) {
                const limitedWaypoints = viaPoints.slice(0, CONFIG.MAX_WAYPOINTS_PER_API_CALL - 2);
                limitedWaypoints.forEach(wp => {
                    url.searchParams.append('waypoints', `${wp.lon},${wp.lat}`);
                });
            }
            
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error('Routing API error');
            }
            
            const data = await response.json();
            const coords = data.geometry.geometry.coordinates.map(c => ({
                lon: c[0],
                lat: c[1]
            }));
            
            return coords;
        } catch (error) {
            console.error('Routing error:', error);
            return null;
        } finally {
            this._setLoading(false);
        }
    }
}

// Singleton instance
export const routingService = new RoutingService();
