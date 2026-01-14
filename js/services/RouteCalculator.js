/**
 * MapyEditor - Route Calculator
 * Business logic for segment geometry calculation
 * 
 * Updated for independent segments - each segment is self-contained
 */

import { CONFIG } from '../config.js';
import { routingService } from './RoutingService.js';

/**
 * Service for segment geometry calculations
 */
class RouteCalculator {
    
    /**
     * Calculate geometry for a manual segment (straight lines between waypoints)
     * For manual segments, geometry = waypoints
     * @param {Segment} segment - The segment to calculate
     * @returns {Array} Array of coordinates forming the geometry
     */
    calculateManualGeometry(segment) {
        return segment.waypoints.map(wp => ({ lat: wp.lat, lon: wp.lon }));
    }
    
    /**
     * Calculate geometry for a routing segment using Mapy.cz API
     * @param {Segment} segment - The segment to calculate
     * @returns {Promise<Array>} Array of coordinates from routing API
     */
    async calculateRoutingGeometry(segment) {
        if (segment.waypoints.length < 2) {
            return [];
        }
        
        // Routing API call with all waypoints
        const start = segment.waypoints[0];
        const end = segment.waypoints[segment.waypoints.length - 1];
        const viaPoints = segment.waypoints.slice(1, -1);
        
        try {
            const geometry = await routingService.calculateRoute(start, end, viaPoints);
            return geometry;
        } catch (error) {
            console.error('Routing calculation failed:', error);
            // Fallback to straight lines on error
            return this.calculateManualGeometry(segment);
        }
    }
    
    /**
     * Calculate geometry for a segment based on its mode
     * @param {Segment} segment - The segment to calculate
     * @returns {Promise<Array>} Array of coordinates
     */
    async calculateSegmentGeometry(segment) {
        if (segment.mode === 'routing') {
            return await this.calculateRoutingGeometry(segment);
        } else {
            return this.calculateManualGeometry(segment);
        }
    }
    
    /**
     * Recalculate geometry for a single segment and update it
     * @param {Segment} segment - The segment to recalculate
     */
    async recalculateSegment(segment) {
        segment.geometry = await this.calculateSegmentGeometry(segment);
    }
    
    /**
     * Recalculate geometry for all segments of a route
     * @param {Route} route - The route to recalculate
     */
    async recalculateRoute(route) {
        for (const segment of route.segments) {
            await this.recalculateSegment(segment);
        }
    }
    
    /**
     * Change segment mode from routing to manual
     * Converts geometry to waypoints (straight lines)
     * @param {Segment} segment - The segment to convert
     */
    changeToManual(segment) {
        if (segment.mode === 'manual') return;
        
        // For manual mode, waypoints ARE the geometry
        // Keep existing waypoints (they become the control points)
        segment.mode = 'manual';
        segment.geometry = this.calculateManualGeometry(segment);
    }
    
    /**
     * Change segment mode from manual to routing
     * Requires waypoints count <= 15 (API limit)
     * @param {Segment} segment - The segment to convert
     * @returns {Promise<boolean>} Success - false if too many waypoints
     */
    async changeToRouting(segment) {
        if (segment.mode === 'routing') return true;
        
        // Check waypoint limit
        if (segment.waypoints.length > CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
            return false;
        }
        
        segment.mode = 'routing';
        segment.geometry = await this.calculateRoutingGeometry(segment);
        return true;
    }
    
    /**
     * Add a waypoint to segment at the end
     * @param {Segment} segment - The segment
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<boolean>} Success - false if limit exceeded
     */
    async addWaypoint(segment, lat, lon) {
        // Check waypoint limit for routing segments
        if (segment.mode === 'routing' && segment.waypoints.length >= CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
            return false;
        }
        
        segment.waypoints.push({ lat, lon });
        await this.recalculateSegment(segment);
        return true;
    }
    
    /**
     * Insert a waypoint into segment at specific index
     * @param {Segment} segment - The segment
     * @param {number} index - Index where to insert (1 = after first waypoint)
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<boolean>} Success - false if limit exceeded
     */
    async insertWaypoint(segment, index, lat, lon) {
        // Check waypoint limit for routing segments
        if (segment.mode === 'routing' && segment.waypoints.length >= CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
            return false;
        }
        
        if (index < 0) index = 0;
        if (index > segment.waypoints.length) index = segment.waypoints.length;
        
        segment.waypoints.splice(index, 0, { lat, lon });
        await this.recalculateSegment(segment);
        return true;
    }
    
    /**
     * Move a waypoint in segment
     * @param {Segment} segment - The segment
     * @param {number} index - Index of waypoint to move
     * @param {number} lat - New latitude
     * @param {number} lon - New longitude
     */
    async moveWaypoint(segment, index, lat, lon) {
        if (index < 0 || index >= segment.waypoints.length) return;
        
        segment.waypoints[index] = { lat, lon };
        await this.recalculateSegment(segment);
    }
    
    /**
     * Delete a waypoint from segment
     * @param {Segment} segment - The segment
     * @param {number} index - Index of waypoint to delete
     * @returns {boolean} Success (false if would leave less than 0 waypoints)
     */
    async deleteWaypoint(segment, index) {
        if (index < 0 || index >= segment.waypoints.length) return false;
        
        segment.waypoints.splice(index, 1);
        
        if (segment.waypoints.length > 0) {
            await this.recalculateSegment(segment);
        } else {
            segment.geometry = [];
        }
        
        return true;
    }
    
    /**
     * Find the closest point on segment geometry to a given point
     * Returns info about where to insert a new waypoint
     * @param {Segment} segment - The segment
     * @param {Object} point - {lat, lon} point to find closest to
     * @returns {Object|null} {index, lat, lon, distance} - index is where to insert
     */
    findClosestPointOnSegment(segment, point) {
        if (!segment.geometry || segment.geometry.length < 2) return null;
        
        let minDist = Infinity;
        let closestPoint = null;
        let insertIndex = 1;
        
        for (let i = 0; i < segment.geometry.length - 1; i++) {
            const p1 = segment.geometry[i];
            const p2 = segment.geometry[i + 1];
            
            const result = this._projectPointOnSegmentLine(point, p1, p2);
            
            if (result.distance < minDist) {
                minDist = result.distance;
                closestPoint = result.point;
                
                // Determine insert index based on geometry position
                // For manual: geometry = waypoints, so insert at i+1
                // For routing: need to find which waypoint segment this belongs to
                if (segment.mode === 'manual') {
                    insertIndex = i + 1;
                } else {
                    // For routing, we insert based on which pair of waypoints
                    // the geometry point falls between
                    insertIndex = this._findWaypointInsertIndex(segment, i);
                }
            }
        }
        
        if (!closestPoint) return null;
        
        return {
            index: insertIndex,
            lat: closestPoint.lat,
            lon: closestPoint.lon,
            distance: minDist
        };
    }
    
    /**
     * Project a point onto a line segment
     * @private
     */
    _projectPointOnSegmentLine(point, p1, p2) {
        const dx = p2.lon - p1.lon;
        const dy = p2.lat - p1.lat;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
            // p1 and p2 are the same point
            const dist = Math.sqrt(
                Math.pow(point.lat - p1.lat, 2) + 
                Math.pow(point.lon - p1.lon, 2)
            );
            return { point: { lat: p1.lat, lon: p1.lon }, distance: dist };
        }
        
        // Project point onto line
        let t = ((point.lon - p1.lon) * dx + (point.lat - p1.lat) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const projLat = p1.lat + t * dy;
        const projLon = p1.lon + t * dx;
        
        const dist = Math.sqrt(
            Math.pow(point.lat - projLat, 2) + 
            Math.pow(point.lon - projLon, 2)
        );
        
        return { point: { lat: projLat, lon: projLon }, distance: dist };
    }
    
    /**
     * For routing segments, find which waypoint index to insert at
     * based on geometry index
     * @private
     */
    _findWaypointInsertIndex(segment, geometryIndex) {
        // For routing segments, we need to map geometry position to waypoint position
        // This is a simplified heuristic - insert after the closest waypoint
        
        if (segment.waypoints.length <= 2) {
            return 1; // Insert between start and end
        }
        
        const geomPoint = segment.geometry[geometryIndex];
        let minDist = Infinity;
        let closestWpIndex = 0;
        
        for (let i = 0; i < segment.waypoints.length; i++) {
            const wp = segment.waypoints[i];
            const dist = Math.pow(wp.lat - geomPoint.lat, 2) + Math.pow(wp.lon - geomPoint.lon, 2);
            if (dist < minDist) {
                minDist = dist;
                closestWpIndex = i;
            }
        }
        
        // Insert after the closest waypoint (but not at the very end)
        return Math.min(closestWpIndex + 1, segment.waypoints.length - 1);
    }
}

// Singleton instance
export const routeCalculator = new RouteCalculator();
