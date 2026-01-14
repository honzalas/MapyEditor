/**
 * MapyEditor - Geometry Utilities
 * Helper functions for geometric calculations
 * 
 * Updated for independent segments - each segment has its own waypoints
 */

/**
 * Project a point onto a line segment
 * @param {Object} point - Point with lat and lng/lon properties
 * @param {Object} p1 - Start point of segment
 * @param {Object} p2 - End point of segment
 * @returns {Object} Projected point with lat and lon properties
 */
export function projectPointOnSegment(point, p1, p2) {
    const dx = p2.lon - p1.lon;
    const dy = p2.lat - p1.lat;
    
    if (dx === 0 && dy === 0) {
        return { lat: p1.lat, lon: p1.lon };
    }
    
    const pointLon = point.lng !== undefined ? point.lng : point.lon;
    
    const t = Math.max(0, Math.min(1, 
        ((pointLon - p1.lon) * dx + (point.lat - p1.lat) * dy) / (dx * dx + dy * dy)
    ));
    
    return {
        lat: p1.lat + t * dy,
        lon: p1.lon + t * dx
    };
}

/**
 * Calculate squared distance between two points (avoids sqrt for comparison)
 * @param {Object} p1 - First point
 * @param {Object} p2 - Second point
 * @returns {number} Squared distance
 */
export function distanceSquared(p1, p2) {
    const dlat = p1.lat - p2.lat;
    const dlon = (p1.lng !== undefined ? p1.lng : p1.lon) - (p2.lng !== undefined ? p2.lng : p2.lon);
    return dlat * dlat + dlon * dlon;
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point
 * @param {Object} p2 - Second point
 * @returns {number} Distance
 */
export function distance(p1, p2) {
    return Math.sqrt(distanceSquared(p1, p2));
}

/**
 * Find the closest point on a polyline geometry
 * @param {Object} latlng - Point to find closest to
 * @param {Array} geometry - Array of points forming the polyline
 * @returns {Object} Result with point, geomIndex, and distance
 */
export function findClosestPointOnPolyline(latlng, geometry) {
    let closestDist = Infinity;
    let closestPoint = null;
    let closestGeomIndex = 0;
    
    for (let i = 0; i < geometry.length - 1; i++) {
        const p1 = geometry[i];
        const p2 = geometry[i + 1];
        
        // Project point onto line segment
        const projected = projectPointOnSegment(latlng, p1, p2);
        const dist = distanceSquared(latlng, projected);
        
        if (dist < closestDist) {
            closestDist = dist;
            closestPoint = projected;
            closestGeomIndex = i;
        }
    }
    
    return {
        point: closestPoint,
        geomIndex: closestGeomIndex,
        distance: Math.sqrt(closestDist)
    };
}

/**
 * Find closest point on segment geometry and determine insert position
 * For the new independent segment model
 * @param {Object} latlng - Point to find closest to
 * @param {Object} segment - Segment object (with own waypoints array)
 * @returns {Object|null} Result with point, distance, insertIndex
 */
export function findClosestPointOnSegment(latlng, segment) {
    if (!segment.geometry || segment.geometry.length < 2) {
        return null;
    }
    
    const result = findClosestPointOnPolyline(latlng, segment.geometry);
    
    if (!result.point) {
        return null;
    }
    
    const closestGeomIndex = result.geomIndex;
    
    // Determine where to insert based on segment mode
    let insertIndex;
    
    if (segment.mode === 'manual') {
        // For manual segments: geometry = waypoints
        // Insert after the geometry point (which equals waypoint)
        insertIndex = closestGeomIndex + 1;
    } else {
        // For routing segments: need to find which pair of waypoints this falls between
        // Use the projected point instead of just one geometry point for better accuracy
        insertIndex = findWaypointInsertIndex(segment, closestGeomIndex, result.point);
    }
    
    return {
        point: result.point,
        geomIndex: closestGeomIndex,
        distance: result.distance,
        insertIndex: insertIndex
    };
}

/**
 * For routing segments, find which waypoint index to insert at
 * based on geometry index and projected point
 * @param {Object} segment - Segment object
 * @param {number} geometryIndex - Index in the geometry array (segment between geometry[i] and geometry[i+1])
 * @param {Object} projectedPoint - The projected point on the geometry (lat, lon)
 * @returns {number} Index where to insert new waypoint
 */
function findWaypointInsertIndex(segment, geometryIndex, projectedPoint) {
    if (segment.waypoints.length <= 2) {
        return 1; // Insert between start and end
    }
    
    // Use the projected point instead of just one geometry point for better accuracy
    // Find the closest waypoint to the projected point
    let minDist = Infinity;
    let closestWpIndex = 0;
    
    for (let i = 0; i < segment.waypoints.length; i++) {
        const wp = segment.waypoints[i];
        const dist = Math.pow(wp.lat - projectedPoint.lat, 2) + Math.pow(wp.lon - projectedPoint.lon, 2);
        if (dist < minDist) {
            minDist = dist;
            closestWpIndex = i;
        }
    }
    
    // Determine if we should insert before or after the closest waypoint
    // by checking distances to adjacent waypoints
    
    // If the closest waypoint is the first one, insert after it
    if (closestWpIndex === 0) {
        return 1;
    }
    
    // If the closest waypoint is the last one, insert before it
    if (closestWpIndex === segment.waypoints.length - 1) {
        return segment.waypoints.length - 1;
    }
    
    // For waypoints in the middle, determine which side by comparing
    // distances to previous and next waypoint
    const prevWp = segment.waypoints[closestWpIndex - 1];
    const nextWp = segment.waypoints[closestWpIndex + 1];
    
    const distToPrev = Math.pow(prevWp.lat - projectedPoint.lat, 2) + Math.pow(prevWp.lon - projectedPoint.lon, 2);
    const distToNext = Math.pow(nextWp.lat - projectedPoint.lat, 2) + Math.pow(nextWp.lon - projectedPoint.lon, 2);
    
    // If closer to previous waypoint, insert after previous (before closest)
    // If closer to next waypoint, insert after closest (before next)
    if (distToPrev < distToNext) {
        return closestWpIndex; // Insert before closest waypoint
    } else {
        return closestWpIndex + 1; // Insert after closest waypoint
    }
}

/**
 * Check if two points are approximately equal
 * @param {Object} p1 - First point
 * @param {Object} p2 - Second point
 * @param {number} tolerance - Tolerance for comparison
 * @returns {boolean}
 */
export function pointsEqual(p1, p2, tolerance = 0.000001) {
    return Math.abs(p1.lat - p2.lat) < tolerance && 
           Math.abs((p1.lon || p1.lng) - (p2.lon || p2.lng)) < tolerance;
}

/**
 * Find all routes that pass through a given point (within tolerance)
 * @param {Object} latlng - Point with lat and lng/lon properties
 * @param {Array} routes - Array of route objects
 * @param {number} maxDistancePixels - Maximum distance in pixels
 * @param {Object} map - Leaflet map instance for pixel conversion
 * @returns {Array} Array of routes sorted by distance
 */
export function findRoutesAtPoint(latlng, routes, maxDistancePixels, map) {
    const results = [];
    
    for (const route of routes) {
        if (!route.segments || route.segments.length === 0) continue;
        
        let minDistance = Infinity;
        
        // Check all segments
        for (const segment of route.segments) {
            if (!segment.geometry || segment.geometry.length < 2) continue;
            
            const result = findClosestPointOnPolyline(latlng, segment.geometry);
            if (result.distance < minDistance) {
                minDistance = result.distance;
            }
        }
        
        if (minDistance === Infinity) continue;
        
        // Convert coordinate distance to pixels
        const point1 = map.latLngToContainerPoint(latlng);
        const testPoint = L.latLng(latlng.lat + minDistance, latlng.lng);
        const point2 = map.latLngToContainerPoint(testPoint);
        const pixelDistance = Math.abs(point2.y - point1.y);
        
        if (pixelDistance <= maxDistancePixels) {
            results.push({
                route: route,
                distance: minDistance,
                pixelDistance: pixelDistance
            });
        }
    }
    
    // Sort by distance (closest first)
    results.sort((a, b) => a.distance - b.distance);
    
    return results;
}
