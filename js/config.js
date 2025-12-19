/**
 * MapyEditor - Configuration
 * Central configuration file for the application
 */

export const CONFIG = {
    // Mapy.cz API
    API_KEY: 'Bs0ir1vypSbrm25vRDd5hNSoYTluBzY7wpmbIy_8zRY',
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
    },
    
    // Route line styles
    ROUTE_LINE: {
        WEIGHT_NORMAL: 4,       // Normal route line width
        WEIGHT_HIGHLIGHT: 5,    // Highlighted route line width (on hover)
        WEIGHT_DETAIL: 5,       // Route line width in detail mode
        WEIGHT_EDIT: 5,         // Route line width in edit mode
        OPACITY_NORMAL: 0.5,    // Normal route opacity
        OPACITY_HIGHLIGHT: 1,   // Highlighted route opacity
        OPACITY_DETAIL: 1,      // Route opacity in detail mode
        OPACITY_EDIT: 1         // Route opacity in edit mode
    }
};

// ==================
// ROUTE ENUMS
// ==================

/**
 * Route type enum
 * @type {Array<{value: string, label: string}>}
 */
export const ROUTE_TYPE_ENUM = [
    { value: 'Hiking', label: 'Turistická trasa' },
    { value: 'Foot', label: 'Pěší trasa' },
    { value: 'FitnessTrail', label: 'Naučná stezka' },
    { value: 'ViaFerrata', label: 'Via ferrata' }
];

/**
 * Route color enum
 * @type {Array<{value: string, label: string, hex: string}>}
 */
export const ROUTE_COLOR_ENUM = [
    { value: 'Red', label: 'Červená', hex: '#D32F2F' },
    { value: 'Blue', label: 'Modrá', hex: '#1976D2' },
    { value: 'Green', label: 'Zelená', hex: '#388E3C' },
    { value: 'Yellow', label: 'Žlutá', hex: '#FBC02D' },
    { value: 'Black', label: 'Černá', hex: '#212121' },
    { value: 'Brown', label: 'Hnědá', hex: '#795548' },
    { value: 'Orange', label: 'Oranžová', hex: '#F57C00' },
    { value: 'Purple', label: 'Fialová', hex: '#7B1FA2' },
    { value: 'Other', label: 'Jiná (vlastní)', hex: null }
];

/**
 * Route network enum (scope/range)
 * @type {Array<{value: string, label: string}>}
 */
export const ROUTE_NETWORK_ENUM = [
    { value: 'Iwn', label: 'Iwn' },
    { value: 'Nwn', label: 'Nwn' },
    { value: 'Lwn', label: 'Lwn' }
];

/**
 * Default color for routes without color attribute (null color)
 */
export const DEFAULT_ROUTE_COLOR = '#808080';

/**
 * Get enum item by value
 * @param {Array} enumArray - The enum array to search
 * @param {string} value - Value to find
 * @returns {Object|null} - Found enum item or null
 */
export function getEnumItem(enumArray, value) {
    return enumArray.find(item => item.value === value) || null;
}

/**
 * Get label for enum value
 * @param {Array} enumArray - The enum array to search
 * @param {string} value - Value to find
 * @returns {string} - Label or value if not found
 */
export function getEnumLabel(enumArray, value) {
    const item = getEnumItem(enumArray, value);
    return item ? item.label : value;
}

// ==================
// LEGACY COLOR MAP (for backward compatibility)
// ==================

// Color mappings for routes (legacy - used for old format import)
export const COLOR_MAP = {
    red: '#D32F2F',
    blue: '#1976D2',
    green: '#388E3C'
};

// Legacy color to new enum mapping
export const LEGACY_COLOR_MAP = {
    'red': 'Red',
    'blue': 'Blue',
    'green': 'Green'
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


