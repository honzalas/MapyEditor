/**
 * MapyEditor - Route Calculator
 * Business logic for route segment calculation and management
 */

import { CONFIG } from '../config.js';
import { routingService } from './RoutingService.js';

/**
 * Service for route calculations and segment management
 */
class RouteCalculator {
    /**
     * Analyze waypoints and create segment definitions
     * A segment is a continuous sequence of waypoints with the same mode
     * Routing segments are split if they exceed MAX_WAYPOINTS_PER_API_CALL
     * @param {Array} waypoints - Route waypoints
     * @returns {Array} Array of segment definitions
     */
    analyzeSegments(waypoints) {
        if (waypoints.length < 2) return [];
        
        const segments = [];
        let currentSegment = null;
        
        for (let i = 1; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const mode = wp.mode;
            
            if (!currentSegment || currentSegment.mode !== mode) {
                // Start new segment
                if (currentSegment) {
                    segments.push(currentSegment);
                }
                currentSegment = {
                    mode: mode,
                    startIndex: i - 1,
                    endIndex: i,
                    waypointIndices: [i - 1, i]
                };
            } else {
                // Continue current segment
                currentSegment.endIndex = i;
                currentSegment.waypointIndices.push(i);
            }
        }
        
        if (currentSegment) {
            segments.push(currentSegment);
        }
        
        // Split routing segments that exceed API limit
        const splitSegments = [];
        for (const seg of segments) {
            if (seg.mode === 'routing' && seg.waypointIndices.length > CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
                // Split into multiple segments
                const indices = seg.waypointIndices;
                for (let i = 0; i < indices.length - 1; i += CONFIG.MAX_WAYPOINTS_PER_API_CALL - 1) {
                    const end = Math.min(i + CONFIG.MAX_WAYPOINTS_PER_API_CALL, indices.length);
                    splitSegments.push({
                        mode: 'routing',
                        startIndex: indices[i],
                        endIndex: indices[end - 1],
                        waypointIndices: indices.slice(i, end)
                    });
                    // Overlap by one to maintain continuity
                    if (end < indices.length) i--;
                }
            } else {
                splitSegments.push(seg);
            }
        }
        
        return splitSegments;
    }
    
    /**
     * Calculate geometry for a manual segment (straight lines)
     * @param {Array} waypoints - All route waypoints
     * @param {Array} segmentIndices - Indices of waypoints in this segment
     * @param {Object|null} previousGeometryEnd - End point of previous segment's geometry
     * @returns {Array} Array of coordinates forming the geometry
     */
    calculateManualSegment(waypoints, segmentIndices, previousGeometryEnd) {
        const geometry = [];
        
        // If we have previousGeometryEnd, start from there and skip the first waypoint
        // (it's the shared boundary point with previous segment)
        if (previousGeometryEnd && segmentIndices.length > 0 && segmentIndices[0] > 0) {
            geometry.push({ lat: previousGeometryEnd.lat, lon: previousGeometryEnd.lon });
            // Skip first waypoint (shared boundary), start from second
            for (let i = 1; i < segmentIndices.length; i++) {
                const wp = waypoints[segmentIndices[i]];
                geometry.push({ lat: wp.lat, lon: wp.lon });
            }
        } else {
            // No previous geometry (first segment) - include all waypoints
            for (let i = 0; i < segmentIndices.length; i++) {
                const wp = waypoints[segmentIndices[i]];
                geometry.push({ lat: wp.lat, lon: wp.lon });
            }
        }
        
        return geometry;
    }
    
    /**
     * Get the end point of previous segment's geometry (for continuity)
     * @param {Object} route - Route object
     * @param {number} segmentIndex - Current segment index
     * @returns {Object|null} Previous geometry end point or null
     */
    getPreviousGeometryEnd(route, segmentIndex) {
        if (segmentIndex > 0 && route.segments[segmentIndex - 1]) {
            const prevGeom = route.segments[segmentIndex - 1].geometry;
            if (prevGeom && prevGeom.length > 0) {
                return prevGeom[prevGeom.length - 1];
            }
        }
        return null;
    }
    
    /**
     * Calculate geometry for a single segment
     * @param {Object} route - Route object
     * @param {Object} segment - Segment definition
     * @param {Object|null} previousGeometryEnd - End point of previous segment's geometry
     * @returns {Promise<Array>} Array of coordinates
     */
    async calculateSegmentGeometry(route, segment, previousGeometryEnd) {
        if (segment.mode === 'routing') {
            return await routingService.calculateRoutingSegment(
                route.waypoints,
                segment.waypointIndices,
                previousGeometryEnd
            );
        } else {
            return this.calculateManualSegment(
                route.waypoints,
                segment.waypointIndices,
                previousGeometryEnd
            );
        }
    }
    
    /**
     * Recalculate geometry for a range of segments
     * @param {Object} route - Route object
     * @param {number} fromIndex - Start segment index
     * @param {number} toIndex - End segment index
     */
    async recalculateSegmentRange(route, fromIndex, toIndex) {
        for (let i = fromIndex; i <= toIndex && i < route.segments.length; i++) {
            const seg = route.segments[i];
            const prevEnd = this.getPreviousGeometryEnd(route, i);
            seg.geometry = await this.calculateSegmentGeometry(route, seg, prevEnd);
        }
        
        // Fix manual-to-routing connections
        this.fixManualToRoutingConnections(route);
    }
    
    /**
     * Check if two segment definitions are equivalent (same waypoints)
     * @param {Object} oldSeg - Old segment
     * @param {Object} newSeg - New segment
     * @returns {boolean}
     */
    segmentsAreEquivalent(oldSeg, newSeg) {
        if (!oldSeg || !newSeg) return false;
        if (oldSeg.mode !== newSeg.mode) return false;
        if (oldSeg.waypointIndices.length !== newSeg.waypointIndices.length) return false;
        return oldSeg.waypointIndices.every((idx, i) => idx === newSeg.waypointIndices[i]);
    }
    
    /**
     * Fix connections between manual and routing segments
     * Manual segments should end at the start of following routing segments (no gaps)
     * @param {Object} route - Route object
     */
    fixManualToRoutingConnections(route) {
        for (let i = 0; i < route.segments.length - 1; i++) {
            const currentSeg = route.segments[i];
            const nextSeg = route.segments[i + 1];
            
            // If current is manual and next is routing, fix the connection
            if (currentSeg.mode === 'manual' && nextSeg.mode === 'routing' &&
                currentSeg.geometry.length > 0 && nextSeg.geometry.length > 0) {
                const routingStart = nextSeg.geometry[0];
                currentSeg.geometry[currentSeg.geometry.length - 1] = {
                    lat: routingStart.lat,
                    lon: routingStart.lon
                };
            }
        }
    }
    
    /**
     * Smart recalculation function
     * Handles all cases: move, insert, append, delete, mode change
     * Optimizes by only recalculating affected segments
     * 
     * @param {Object} route - The route to recalculate
     * @param {Object} options - Options for recalculation
     * @param {string} options.operation - 'move', 'insert', 'append', 'delete', 'modeChange', 'full'
     * @param {number} options.waypointIndex - Index of affected waypoint
     * @param {number} options.segmentIndex - Index of affected segment (for insert midpoint)
     */
    async smartRecalculate(route, options = {}) {
        const { operation = 'full', waypointIndex, segmentIndex } = options;
        
        // For 'move' operation, structure doesn't change - just recalculate affected segments
        if (operation === 'move' && waypointIndex !== undefined && route.segments.length > 0) {
            // Find segments containing this waypoint
            const affectedIndices = [];
            for (let i = 0; i < route.segments.length; i++) {
                if (route.segments[i].waypointIndices.includes(waypointIndex)) {
                    affectedIndices.push(i);
                }
            }
            
            if (affectedIndices.length === 0) return;
            
            let fromIdx = Math.min(...affectedIndices);
            let toIdx = Math.max(...affectedIndices);
            
            // If waypoint is at boundary, also recalculate next segment
            const isAtBoundary = affectedIndices.length > 1 || 
                route.segments[fromIdx].startIndex === waypointIndex ||
                route.segments[toIdx].endIndex === waypointIndex;
            
            if (isAtBoundary && toIdx + 1 < route.segments.length) {
                toIdx++;
            }
            
            await this.recalculateSegmentRange(route, fromIdx, toIdx);
            return;
        }
        
        // For operations that change structure, rebuild and compare
        const oldSegments = route.segments;
        const newSegmentDefs = this.analyzeSegments(route.waypoints);
        
        // Build new segments, preserving geometry where possible
        route.segments = [];
        let firstChangedIndex = -1;
        
        for (let i = 0; i < newSegmentDefs.length; i++) {
            const newDef = newSegmentDefs[i];
            const oldSeg = oldSegments[i];
            
            const newSeg = {
                mode: newDef.mode,
                startIndex: newDef.startIndex,
                endIndex: newDef.endIndex,
                waypointIndices: newDef.waypointIndices,
                geometry: []
            };
            
            // Check if we can reuse old geometry
            if (this.segmentsAreEquivalent(oldSeg, newDef) && oldSeg.geometry) {
                newSeg.geometry = oldSeg.geometry;
            } else {
                // Mark this as first changed segment
                if (firstChangedIndex === -1) {
                    firstChangedIndex = i;
                }
            }
            
            route.segments.push(newSeg);
        }
        
        // If no segments changed and counts match, we're done
        if (firstChangedIndex === -1 && newSegmentDefs.length === oldSegments.length) {
            return;
        }
        
        // Recalculate from first changed segment to end
        // (because each segment depends on previous geometry end)
        const startIdx = firstChangedIndex === -1 ? 0 : firstChangedIndex;
        await this.recalculateSegmentRange(route, startIdx, route.segments.length - 1);
        
        // Fix all manual-to-routing connections
        this.fixManualToRoutingConnections(route);
    }
    
    /**
     * Full recalculation (for import, etc.)
     * @param {Object} route - Route object
     */
    async recalculateRouteGeometry(route) {
        await this.smartRecalculate(route, { operation: 'full' });
    }
}

// Singleton instance
export const routeCalculator = new RouteCalculator();






