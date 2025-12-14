/**
 * MapyEditor - Configuration
 * Central configuration file for the application
 */

export const CONFIG = {
    // Mapy.cz API
    API_KEY: 'eyJpIjo1LCJjIjoxNjM3MjMxMTY1fQ.wQ9-T6PhNT85YhqKRZPbp-iAIosTyIDfdw_ADBdUrn0',
    ROUTE_TYPE: 'foot_fast',
    
    // Route calculation limits
    MAX_WAYPOINTS_PER_API_CALL: 15,
    
    // Keyboard shortcuts
    KEYS: {
        ROUTING: 'Control',
        MANUAL: 'Alt'
    },
    
    // Map defaults
    MAP: {
        CENTER: [49.8729317, 14.8981184],
        ZOOM: 8,
        MIN_ZOOM: 0,
        MAX_ZOOM: 20
    },
    
    // UI thresholds
    UI: {
        HOVER_MARKER_DISTANCE_PX: 20,
        WAYPOINT_PROXIMITY_PX: 20
    }
};

// Color mappings for routes
export const COLOR_MAP = {
    red: '#D32F2F',
    blue: '#1976D2',
    green: '#388E3C'
};

// Marker colors
export const MARKER_COLORS = {
    START: '#4CAF50',      // Green
    END: '#F44336',        // Red
    ROUTING: '#FFC107',    // Yellow
    MANUAL: '#90CAF9'      // Light blue
};

// Marker sizes
export const MARKER_SIZES = {
    ENDPOINT: 16,
    WAYPOINT: 14
};


