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
     * Calculate route between two points with optional waypoints
     * @param {Object} start - Start point {lat, lon}
     * @param {Object} end - End point {lat, lon}
     * @param {Array} waypoints - Array of intermediate waypoints
     * @returns {Promise<Array|null>} Array of coordinates or null on error
     */
    async calculateRoute(start, end, waypoints = []) {
        this._setLoading(true);
        
        try {
            const url = new URL('https://api.mapy.com/v1/routing/route');
            url.searchParams.set('apikey', CONFIG.API_KEY);
            url.searchParams.set('start', `${start.lon},${start.lat}`);
            url.searchParams.set('end', `${end.lon},${end.lat}`);
            url.searchParams.set('routeType', CONFIG.ROUTE_TYPE);
            url.searchParams.set('format', 'geojson');
            
            // Add waypoints (max 15 per API call)
            if (waypoints.length > 0) {
                const limitedWaypoints = waypoints.slice(0, CONFIG.MAX_WAYPOINTS_PER_API_CALL);
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
    
    /**
     * Calculate route for a segment of waypoints
     * @param {Array} waypoints - All route waypoints
     * @param {Array} segmentIndices - Indices of waypoints in this segment
     * @param {Object|null} previousGeometryEnd - End point of previous segment's geometry
     * @returns {Promise<Array|null>} Array of coordinates or null on error
     */
    async calculateRoutingSegment(waypoints, segmentIndices, previousGeometryEnd) {
        const points = segmentIndices.map(i => waypoints[i]);
        
        // Determine start point - either previous geometry end or first waypoint
        let startPoint;
        if (previousGeometryEnd && segmentIndices[0] > 0) {
            startPoint = previousGeometryEnd;
        } else {
            startPoint = points[0];
        }
        
        const endPoint = points[points.length - 1];
        const middlePoints = points.slice(1, -1);
        
        const result = await this.calculateRoute(startPoint, endPoint, middlePoints);
        
        if (!result) {
            // Fallback to straight line
            return [startPoint, endPoint];
        }
        
        return result;
    }
}

// Singleton instance
export const routingService = new RoutingService();





