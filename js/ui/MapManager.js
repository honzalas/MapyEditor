/**
 * MapyEditor - Map Manager
 * Manages Leaflet map initialization and configuration
 */

import { CONFIG } from '../config.js';

/**
 * Manages the Leaflet map instance and tile layers
 */
class MapManager {
    constructor() {
        this._map = null;
        this._tileLayers = {};
        this._routeLayers = {}; // routeId -> { lines, markers }
    }
    
    /**
     * Get the Leaflet map instance
     */
    get map() {
        return this._map;
    }
    
    /**
     * Get route layers
     */
    get routeLayers() {
        return this._routeLayers;
    }
    
    /**
     * Initialize the map
     * @param {string} containerId - ID of the map container element
     */
    initialize(containerId) {
        // Create map
        this._map = L.map(containerId).setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
        
        // Create tile layers
        this._tileLayers = {
            'Základní': L.tileLayer(`https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${CONFIG.API_KEY}`, {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
            }),
            'Turistická': L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${CONFIG.API_KEY}`, {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
            }),
            'Zimní': L.tileLayer(`https://api.mapy.com/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${CONFIG.API_KEY}`, {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
            }),
            'Letecká': L.tileLayer(`https://api.mapy.com/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${CONFIG.API_KEY}`, {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
            }),
        };
        
        // Add default layer
        this._tileLayers['Základní'].addTo(this._map);
        
        // Add layer control
        L.control.layers(this._tileLayers).addTo(this._map);
        
        // Apply grayscale filter to Basic map layer
        this._applyBasicLayerFilter();
        
        // Reapply filter when switching to Basic map
        this._map.on('baselayerchange', (e) => {
            if (e.name === 'Základní') {
                this._applyBasicLayerFilter();
            }
        });
        
        // Add logo control
        this._addLogoControl();
        
        // Prevent default context menu
        this._map.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
        });
        
        return this._map;
    }
    
    /**
     * Apply grayscale filter to basic map layer
     * @private
     */
    _applyBasicLayerFilter() {
        setTimeout(() => {
            const container = this._tileLayers['Základní'].getContainer();
            if (container) {
                container.style.filter = 'grayscale(90%) opacity(60%)';
            }
        }, 100);
    }
    
    /**
     * Add Mapy.cz logo control
     * @private
     */
    _addLogoControl() {
        const LogoControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: function(map) {
                const container = L.DomUtil.create('div');
                const link = L.DomUtil.create('a', '', container);
                link.setAttribute('href', 'http://mapy.com/');
                link.setAttribute('target', '_blank');
                link.innerHTML = '<img src="https://api.mapy.com/img/api/logo.svg" />';
                L.DomEvent.disableClickPropagation(link);
                return container;
            },
        });
        new LogoControl().addTo(this._map);
    }
    
    /**
     * Update map cursor mode
     * @param {string} mode - Cursor mode: 'default', 'add-routing-mode', 'add-manual-mode', 'add-start-mode'
     */
    setCursorMode(mode) {
        const mapElement = document.getElementById('map');
        mapElement.classList.remove('add-routing-mode', 'add-manual-mode', 'add-start-mode');
        
        if (mode && mode !== 'default') {
            mapElement.classList.add(mode);
        }
    }
    
    /**
     * Fit map bounds to given coordinates
     * @param {Array} coordinates - Array of {lat, lon} objects
     * @param {Object} options - Leaflet fitBounds options
     */
    fitBounds(coordinates, options = { padding: [50, 50] }) {
        if (coordinates.length === 0) return;
        
        const latLngs = coordinates.map(c => [c.lat, c.lon]);
        const bounds = L.latLngBounds(latLngs);
        this._map.fitBounds(bounds, options);
    }
    
    /**
     * Store route layer references
     * @param {number} routeId - Route ID
     * @param {Object} layers - { lines: [], markers: [] }
     */
    setRouteLayers(routeId, layers) {
        this._routeLayers[routeId] = layers;
    }
    
    /**
     * Get route layer references
     * @param {number} routeId - Route ID
     * @returns {Object|null}
     */
    getRouteLayers(routeId) {
        return this._routeLayers[routeId] || null;
    }
    
    /**
     * Remove route layers from map
     * @param {number} routeId - Route ID
     */
    removeRouteLayers(routeId) {
        const layers = this._routeLayers[routeId];
        if (layers) {
            if (layers.lines) {
                layers.lines.forEach(l => this._map.removeLayer(l));
            }
            if (layers.markers) {
                layers.markers.forEach(m => this._map.removeLayer(m));
            }
            delete this._routeLayers[routeId];
        }
    }
    
    /**
     * Convert lat/lng to container point
     * @param {Object} latlng - Leaflet LatLng or {lat, lon/lng}
     * @returns {Object} Container point
     */
    latLngToContainerPoint(latlng) {
        return this._map.latLngToContainerPoint(latlng);
    }
    
    /**
     * Register event handler on map
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        this._map.on(event, handler);
    }
    
    /**
     * Remove event handler from map
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        this._map.off(event, handler);
    }
    
    /**
     * Check if map has a layer
     * @param {Object} layer - Leaflet layer
     * @returns {boolean}
     */
    hasLayer(layer) {
        return this._map.hasLayer(layer);
    }
    
    /**
     * Add layer to map
     * @param {Object} layer - Leaflet layer
     */
    addLayer(layer) {
        layer.addTo(this._map);
    }
    
    /**
     * Remove layer from map
     * @param {Object} layer - Leaflet layer
     */
    removeLayer(layer) {
        this._map.removeLayer(layer);
    }
}

// Singleton instance
export const mapManager = new MapManager();


