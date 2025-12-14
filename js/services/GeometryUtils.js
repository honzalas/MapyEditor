/**
 * MapyEditor - Geometry Utilities
 * Helper functions for geometric calculations
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
    const dlon = (p1.lng !== undefined ? p1.lng : p1.lon) - p2.lon;
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
 * Find geometry indices that correspond to waypoints in a routing segment
 * @param {Object} segment - Segment object
 * @param {Array} waypoints - Route waypoints
 * @returns {Array} Array of geometry indices
 */
export function findWaypointGeometryIndices(segment, waypoints) {
    const indices = [0]; // First waypoint is at geometry index 0
    
    // For each intermediate waypoint, find closest geometry point
    for (let i = 1; i < segment.waypointIndices.length - 1; i++) {
        const wpIdx = segment.waypointIndices[i];
        const wp = waypoints[wpIdx];
        
        let closestDist = Infinity;
        let closestIdx = 0;
        
        for (let j = 0; j < segment.geometry.length; j++) {
            const g = segment.geometry[j];
            const dist = (wp.lat - g.lat) ** 2 + (wp.lon - g.lon) ** 2;
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = j;
            }
        }
        indices.push(closestIdx);
    }
    
    indices.push(segment.geometry.length - 1); // Last waypoint is at last geometry index
    return indices;
}

/**
 * Find closest point on geometry and determine insert position
 * @param {Object} latlng - Point to find closest to
 * @param {Object} segment - Segment object
 * @param {Array} waypoints - Route waypoints
 * @returns {Object} Result with point, geomIndex, distance, insertIndex, mode
 */
export function findClosestPointOnGeometry(latlng, segment, waypoints) {
    const geometry = segment.geometry;
    const result = findClosestPointOnPolyline(latlng, geometry);
    
    if (!result.point) {
        return null;
    }
    
    const closestGeomIndex = result.geomIndex;
    
    // Determine which waypoint pair this geometry index falls between
    let insertIndex;
    let inheritedMode;
    
    if (segment.mode === 'manual') {
        // For manual segments:
        // - If startIndex > 0: geometry[0] = previousGeometryEnd, geometry[i] for i>=1 maps to waypointIndices[i]
        // - If startIndex === 0: geometry[i] maps directly to waypointIndices[i]
        const hasPreviousGeometry = segment.startIndex > 0;
        
        if (hasPreviousGeometry) {
            // geometry[0] = previousGeometryEnd (not a waypoint)
            // geometry[i] for i >= 1 corresponds to waypointIndices[i]
            if (closestGeomIndex === 0) {
                // Clicking between previousGeometryEnd and first actual manual waypoint
                // Insert at position of first manual waypoint (waypointIndices[1])
                insertIndex = segment.waypointIndices[1];
            } else {
                // Clicking between geometry[closestGeomIndex] and geometry[closestGeomIndex+1]
                insertIndex = segment.waypointIndices[closestGeomIndex] + 1;
            }
        } else {
            // First segment - geometry maps directly to waypoints
            insertIndex = segment.waypointIndices[closestGeomIndex] + 1;
        }
        inheritedMode = 'manual';
    } else {
        // For routing segments, find which pair of waypoints this point is between
        const waypointGeomIndices = findWaypointGeometryIndices(segment, waypoints);
        
        // Find which segment of waypoints we're in
        let wpPairStart = 0;
        for (let i = 0; i < waypointGeomIndices.length - 1; i++) {
            if (closestGeomIndex >= waypointGeomIndices[i] && closestGeomIndex < waypointGeomIndices[i + 1]) {
                wpPairStart = i;
                break;
            }
            wpPairStart = i;
        }
        
        // Insert after this waypoint in the segment
        insertIndex = segment.waypointIndices[wpPairStart] + 1;
        inheritedMode = 'routing';
    }
    
    return {
        point: result.point,
        geomIndex: closestGeomIndex,
        distance: result.distance,
        insertIndex: insertIndex,
        mode: inheritedMode
    };
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


