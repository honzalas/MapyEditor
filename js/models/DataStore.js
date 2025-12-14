/**
 * MapyEditor - DataStore
 * Central data store with event emission for reactive updates
 */

import { 
    ROUTE_TYPE_ENUM, 
    ROUTE_COLOR_ENUM, 
    ROUTE_NETWORK_ENUM,
    DEFAULT_ROUTE_COLOR,
    getEnumItem,
    getEnumLabel 
} from '../config.js';

/**
 * Simple event emitter mixin
 */
class EventEmitter {
    constructor() {
        this._events = {};
    }
    
    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (!this._events[event]) return;
        this._events[event].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in event handler for ${event}:`, e);
            }
        });
    }
}

/**
 * Route model with OSM-like attributes
 * 
 * Attributes:
 * - routeType: enum (Hiking, Foot, FitnessTrail, ViaFerrata) - required, default: Hiking
 * - color: enum (Red, Blue, Green, Yellow, Black, Brown, Orange, Purple, Other) - optional
 * - customColor: string (hex color) - used when color == 'Other'
 * - symbol: string - text description of route marking
 * - name: string - route name
 * - ref: string - route number/abbreviation
 * - network: enum (Iwn, Nwn, Lwn) - route scope, default: Nwn
 * - wikidata: string - Wikidata ID
 * - customData: string - custom user data
 */
export class Route {
    constructor(data = {}) {
        this.id = data.id || null;
        
        // New OSM-like attributes
        this.routeType = data.routeType || 'Hiking';
        this.color = data.color || null;
        this.customColor = data.customColor || null;
        this.symbol = data.symbol || null;
        this.name = data.name || null;
        this.ref = data.ref || null;
        this.network = data.network || 'Nwn';
        this.wikidata = data.wikidata || null;
        this.customData = data.customData || null;
        
        // Geometry data
        this.waypoints = data.waypoints || [];
        this.segments = data.segments || [];
    }
    
    /**
     * Get display title for the route
     * Uses coalesce(ref, name, "noname")
     * @returns {string}
     */
    getTitle() {
        return this.ref || this.name || 'noname';
    }
    
    /**
     * Get display subtitle for the route
     * Shows route type in Czech
     * @returns {string}
     */
    getSubtitle() {
        return getEnumLabel(ROUTE_TYPE_ENUM, this.routeType);
    }
    
    /**
     * Get color hex value for the route
     * - If color is null -> DEFAULT_ROUTE_COLOR (gray)
     * - If color is 'Other' -> customColor
     * - Otherwise -> hex from enum
     * @returns {string}
     */
    getColor() {
        if (this.color === null) {
            return DEFAULT_ROUTE_COLOR;
        }
        
        if (this.color === 'Other') {
            return this.customColor || DEFAULT_ROUTE_COLOR;
        }
        
        const colorItem = getEnumItem(ROUTE_COLOR_ENUM, this.color);
        return colorItem ? colorItem.hex : DEFAULT_ROUTE_COLOR;
    }
    
    /**
     * Get all attribute names for comparison/backup
     * @returns {Array<string>}
     */
    static getAttributeNames() {
        return ['routeType', 'color', 'customColor', 'symbol', 'name', 'ref', 'network', 'wikidata', 'customData'];
    }
    
    clone() {
        return new Route({
            id: this.id,
            routeType: this.routeType,
            color: this.color,
            customColor: this.customColor,
            symbol: this.symbol,
            name: this.name,
            ref: this.ref,
            network: this.network,
            wikidata: this.wikidata,
            customData: this.customData,
            waypoints: this.waypoints.map(wp => ({ ...wp })),
            segments: this.segments.map(seg => ({
                ...seg,
                waypointIndices: [...seg.waypointIndices],
                geometry: seg.geometry.map(g => ({ ...g }))
            }))
        });
    }
    
    toJSON() {
        return {
            id: this.id,
            routeType: this.routeType,
            color: this.color,
            customColor: this.customColor,
            symbol: this.symbol,
            name: this.name,
            ref: this.ref,
            network: this.network,
            wikidata: this.wikidata,
            customData: this.customData,
            waypoints: this.waypoints,
            segments: this.segments
        };
    }
}

/**
 * Central data store for the application
 * Singleton pattern with event emission
 */
class DataStore extends EventEmitter {
    constructor() {
        super();
        this._routes = [];
        this._nextRouteId = 1;
        this._activeRouteId = null;
        this._isEditing = false;
        this._routeBackup = null;
        this._routeSearchQuery = '';
        
        // Key states
        this._ctrlPressed = false;
        this._altPressed = false;
    }
    
    // ==================
    // ROUTES
    // ==================
    
    get routes() {
        return this._routes;
    }
    
    get activeRouteId() {
        return this._activeRouteId;
    }
    
    get activeRoute() {
        return this._routes.find(r => r.id === this._activeRouteId) || null;
    }
    
    get isEditing() {
        return this._isEditing;
    }
    
    get routeBackup() {
        return this._routeBackup;
    }
    
    get routeSearchQuery() {
        return this._routeSearchQuery;
    }
    
    set routeSearchQuery(value) {
        this._routeSearchQuery = value;
        this.emit('search:changed', value);
    }
    
    // Key states
    get ctrlPressed() {
        return this._ctrlPressed;
    }
    
    set ctrlPressed(value) {
        if (this._ctrlPressed !== value) {
            this._ctrlPressed = value;
            this.emit('keys:changed', { ctrl: value, alt: this._altPressed });
        }
    }
    
    get altPressed() {
        return this._altPressed;
    }
    
    set altPressed(value) {
        if (this._altPressed !== value) {
            this._altPressed = value;
            this.emit('keys:changed', { ctrl: this._ctrlPressed, alt: value });
        }
    }
    
    /**
     * Get route by ID
     */
    getRoute(id) {
        return this._routes.find(r => r.id === id) || null;
    }
    
    /**
     * Get filtered routes based on search query
     * Searches in name, ref, and symbol
     */
    getFilteredRoutes() {
        if (!this._routeSearchQuery) {
            return this._routes;
        }
        const query = this._routeSearchQuery.toLowerCase();
        return this._routes.filter(route => {
            const name = route.name || '';
            const ref = route.ref || '';
            const symbol = route.symbol || '';
            return name.toLowerCase().includes(query) ||
                   ref.toLowerCase().includes(query) ||
                   symbol.toLowerCase().includes(query);
        });
    }
    
    /**
     * Create a new route
     */
    createRoute() {
        const route = new Route({
            id: this._nextRouteId++,
            routeType: 'Hiking',
            color: null,
            name: null,
            ref: null,
            network: 'Nwn',
            waypoints: [],
            segments: []
        });
        this._routes.push(route);
        this.emit('route:created', route);
        return route;
    }
    
    /**
     * Add an existing route (e.g., from import)
     */
    addRoute(routeData) {
        const route = routeData instanceof Route ? routeData : new Route(routeData);
        if (!route.id) {
            route.id = this._nextRouteId++;
        } else if (route.id >= this._nextRouteId) {
            this._nextRouteId = route.id + 1;
        }
        this._routes.push(route);
        this.emit('route:added', route);
        return route;
    }
    
    /**
     * Update a route
     */
    updateRoute(id, updates) {
        const route = this.getRoute(id);
        if (!route) return null;
        
        Object.assign(route, updates);
        this.emit('route:updated', route);
        return route;
    }
    
    /**
     * Delete a route
     */
    deleteRoute(id) {
        const index = this._routes.findIndex(r => r.id === id);
        if (index === -1) return false;
        
        const route = this._routes[index];
        this._routes.splice(index, 1);
        
        if (this._activeRouteId === id) {
            this._activeRouteId = null;
            this._isEditing = false;
            this._routeBackup = null;
        }
        
        this.emit('route:deleted', route);
        return true;
    }
    
    /**
     * Clear all routes
     */
    clearRoutes() {
        this._routes = [];
        this._activeRouteId = null;
        this._isEditing = false;
        this._routeBackup = null;
        this.emit('routes:cleared');
    }
    
    /**
     * Set all routes (e.g., from import)
     */
    setRoutes(routes) {
        this._routes = routes.map(r => r instanceof Route ? r : new Route(r));
        // Update nextRouteId
        const maxId = Math.max(0, ...this._routes.map(r => r.id || 0));
        this._nextRouteId = maxId + 1;
        this.emit('routes:loaded', this._routes);
    }
    
    // ==================
    // ACTIVE ROUTE / EDITING
    // ==================
    
    /**
     * Activate a route for editing
     */
    activateRoute(id) {
        if (this._isEditing) return false;
        
        const route = this.getRoute(id);
        if (!route) return false;
        
        const previousActiveId = this._activeRouteId;
        this._activeRouteId = id;
        this._isEditing = true;
        
        // Create backup
        this._routeBackup = route.clone();
        
        this.emit('route:activated', { route, previousActiveId });
        return true;
    }
    
    /**
     * Deactivate current route
     */
    deactivateRoute() {
        const previousActiveId = this._activeRouteId;
        const route = this.activeRoute;
        
        this._activeRouteId = null;
        this._isEditing = false;
        this._routeBackup = null;
        
        this.emit('route:deactivated', { route, previousActiveId });
    }
    
    /**
     * Cancel editing and restore backup
     */
    cancelEditing() {
        const route = this.activeRoute;
        if (!route) {
            this.deactivateRoute();
            return;
        }
        
        // Check if this is a new route (backup had no/few waypoints)
        const isNewRoute = !this._routeBackup || this._routeBackup.waypoints.length < 2;
        
        if (isNewRoute) {
            // New route - delete it completely
            this.deleteRoute(this._activeRouteId);
        } else {
            // Existing route - restore all attributes from backup
            Route.getAttributeNames().forEach(attr => {
                route[attr] = this._routeBackup[attr];
            });
            route.waypoints = this._routeBackup.waypoints;
            route.segments = this._routeBackup.segments;
            this.emit('route:restored', route);
        }
        
        this.deactivateRoute();
    }
    
    /**
     * Check if there are unsaved changes
     */
    hasChanges() {
        const route = this.activeRoute;
        if (!route || !this._routeBackup) return false;
        
        // Check all route attributes
        for (const attr of Route.getAttributeNames()) {
            if (route[attr] !== this._routeBackup[attr]) {
                return true;
            }
        }
        
        // Check waypoints count
        if (route.waypoints.length !== this._routeBackup.waypoints.length) {
            return true;
        }
        
        // Check waypoints content (coordinates and modes)
        for (let i = 0; i < route.waypoints.length; i++) {
            const wp = route.waypoints[i];
            const backupWp = this._routeBackup.waypoints[i];
            
            if (Math.abs(wp.lat - backupWp.lat) > 0.000001 ||
                Math.abs(wp.lon - backupWp.lon) > 0.000001 ||
                wp.mode !== backupWp.mode) {
                return true;
            }
        }
        
        return false;
    }
}

// Singleton instance
export const dataStore = new DataStore();


