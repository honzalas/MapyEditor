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
        this._overlayLayers = {}; // Overlay layers (heatmap tiles)
        this._routeLayers = {}; // routeId -> { lines, markers, decorators }
        this._routesLayerGroup = null; // FeatureGroup containing all routes
        this._routesHidden = false; // Flag to track if routes are hidden
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
        
        // Create base tile layers
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
            'OSM': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
            }),
           /* 'Kompass': L.tileLayer('https://map3.kompass.de/{z}/{x}/{y}/kompass_touristic?key=2ba8c124-38b6-11e7-ade1-e0cb4e14e399&proj=outdooractive', {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '&copy; <a href="https://www.kompass.de" target="_blank">Kompass</a>',
            }),
            'Rother': L.tileLayer('https://rother-tiles.s3.eu-central-1.amazonaws.com/Wien_premium/{z}/{x}/{y}.png', {
                minZoom: CONFIG.MAP.MIN_ZOOM,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                attribution: '&copy; <a href="https://www.rother.de" target="_blank">Rother</a>',
            }),*/
        };
        
        // Create overlay layers (heatmap tiles) - grouped together
        const mapyboxHeatmap = L.tileLayer('https://heatmap-tiles.mapy.dev.dszn.cz/v2-mapybox-ma2/{z}/{x}/{y}', {
            minZoom: CONFIG.MAP.MIN_ZOOM,
            maxZoom: CONFIG.MAP.MAX_ZOOM,
        });
        const ninjaHeatmap = L.tileLayer('https://heatmap-tiles.mapy.dev.dszn.cz/v2-ninja-ma2/{z}/{x}/{y}', {
            minZoom: CONFIG.MAP.MIN_ZOOM,
            maxZoom: CONFIG.MAP.MAX_ZOOM,
        });
        
        // Group both heatmap layers together
        this._heatmapLayerGroup = L.layerGroup([mapyboxHeatmap, ninjaHeatmap]);
        
        // Tourist routes overlay (z-x-y tile format)
        const touristRoutesLayer = L.tileLayer('https://janice.dev.dszn.cz/tiles/tourist_routes/{z}-{x}-{y}', {
            minZoom: CONFIG.MAP.MIN_ZOOM,
            maxZoom: CONFIG.MAP.MAX_ZOOM,
        });
        
        // Create FeatureGroup for all routes
        this._routesLayerGroup = L.featureGroup();
        
        this._overlayLayers = {
            'Heatmap': this._heatmapLayerGroup,
            'Voralbersko': touristRoutesLayer,
            'Skrýt trasy': this._routesLayerGroup,
        };
        
        // Add default layer
        this._tileLayers['Základní'].addTo(this._map);
        
        // Apply referrerPolicy to all tile layers via DOM manipulation
        this._applyReferrerPolicy();
        
        // Reapply referrerPolicy when layers change
        this._map.on('baselayerchange', () => {
            this._applyReferrerPolicy();
        });
        
        // Apply referrerPolicy to newly loaded tiles
        this._map.on('tileload', (e) => {
            if (e.tile && e.tile.tagName === 'IMG') {
                e.tile.referrerPolicy = 'no-referrer';
            }
        });
        
        // Add layer control with base layers and overlays
        const layerControl = L.control.layers(this._tileLayers, this._overlayLayers).addTo(this._map);
        
        // When checkbox is checked, hide routes (remove from map)
        // When unchecked, show routes (add to map)
        this._map.on('overlayadd', (e) => {
            if (e.layer === this._routesLayerGroup) {
                // Checkbox was checked - hide all routes
                this._routesHidden = true;
                this._hideAllRoutes();
            }
        });
        
        this._map.on('overlayremove', (e) => {
            if (e.layer === this._routesLayerGroup) {
                // Checkbox was unchecked - show all routes
                this._routesHidden = false;
                this._showAllRoutes();
            }
        });
        
        // Apply grayscale filter to Basic map layer
        this._applyBasicLayerFilter();
        
        // Reapply filter when switching to Basic map
        this._map.on('baselayerchange', (e) => {
            if (e.name === 'Základní') {
                this._applyBasicLayerFilter();
            } else {
                // Remove filter from other layers
                Object.keys(this._tileLayers).forEach(layerName => {
                    if (layerName !== 'Základní') {
                        const layer = this._tileLayers[layerName];
                        const container = layer.getContainer();
                        if (container) {
                            container.style.filter = '';
                        }
                    }
                });
            }
        });
        
        // Add logo control
        this._addLogoControl();
        
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
     * Apply referrerPolicy: no-referrer to all tile layer images
     * @private
     */
    _applyReferrerPolicy() {
        setTimeout(() => {
            // Apply to all tile layer containers
            Object.values(this._tileLayers).forEach(layer => {
                const container = layer.getContainer();
                if (container) {
                    const images = container.querySelectorAll('img');
                    images.forEach(img => {
                        img.referrerPolicy = 'no-referrer';
                    });
                }
            });
            
            // Apply to overlay layers
            Object.values(this._overlayLayers).forEach(layer => {
                if (layer.getContainer) {
                    const container = layer.getContainer();
                    if (container) {
                        const images = container.querySelectorAll('img');
                        images.forEach(img => {
                            img.referrerPolicy = 'no-referrer';
                        });
                    }
                }
            });
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
     * @param {Object} layers - { lines: [], markers: [], decorators: [] }
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
            if (layers.decorators) {
                layers.decorators.forEach(d => this._map.removeLayer(d));
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
     * Add route layer to map (respects hide routes setting)
     * @param {Object} layer - Route layer (line, marker, or decorator)
     */
    addRouteLayer(layer) {
        // Don't add route layers if routes are hidden
        if (this._routesHidden) {
            return;
        }
        layer.addTo(this._map);
    }
    
    /**
     * Check if routes are currently hidden
     * @returns {boolean}
     */
    areRoutesHidden() {
        return this._routesHidden;
    }
    
    /**
     * Remove layer from map
     * @param {Object} layer - Leaflet layer
     */
    removeLayer(layer) {
        this._map.removeLayer(layer);
    }
    
    /**
     * Get the routes layer group (for adding route layers)
     * @returns {L.FeatureGroup}
     */
    getRoutesLayerGroup() {
        return this._routesLayerGroup;
    }
    
    /**
     * Hide all routes from map
     * @private
     */
    _hideAllRoutes() {
        Object.values(this._routeLayers).forEach(layers => {
            if (layers.lines) {
                layers.lines.forEach(line => {
                    this._map.removeLayer(line);
                });
            }
            if (layers.markers) {
                layers.markers.forEach(marker => {
                    this._map.removeLayer(marker);
                });
            }
            if (layers.decorators) {
                layers.decorators.forEach(decorator => {
                    this._map.removeLayer(decorator);
                });
            }
        });
    }
    
    /**
     * Show all routes on map
     * @private
     */
    _showAllRoutes() {
        Object.values(this._routeLayers).forEach(layers => {
            if (layers.lines) {
                layers.lines.forEach(line => {
                    line.addTo(this._map);
                });
            }
            if (layers.markers) {
                layers.markers.forEach(marker => {
                    marker.addTo(this._map);
                });
            }
            if (layers.decorators) {
                layers.decorators.forEach(decorator => {
                    decorator.addTo(this._map);
                });
            }
        });
    }
}

// Singleton instance
export const mapManager = new MapManager();


