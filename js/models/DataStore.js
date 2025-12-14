/**
 * MapyEditor - DataStore
 * Central data store with event emission for reactive updates
 */

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
 * Route model
 */
export class Route {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || 'Nová trasa';
        this.color = data.color || 'red';
        this.waypoints = data.waypoints || [];
        this.segments = data.segments || [];
    }
    
    clone() {
        return new Route({
            id: this.id,
            name: this.name,
            color: this.color,
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
            name: this.name,
            color: this.color,
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
     */
    getFilteredRoutes() {
        if (!this._routeSearchQuery) {
            return this._routes;
        }
        const query = this._routeSearchQuery.toLowerCase();
        return this._routes.filter(route => {
            const name = route.name || '';
            return name.toLowerCase().includes(query);
        });
    }
    
    /**
     * Create a new route
     */
    createRoute(name = 'Nová trasa', color = 'red') {
        const route = new Route({
            id: this._nextRouteId++,
            name,
            color,
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
            // Existing route - restore from backup
            route.name = this._routeBackup.name;
            route.color = this._routeBackup.color;
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
        
        return route.waypoints.length > 0 || 
            route.name !== this._routeBackup.name ||
            route.color !== this._routeBackup.color;
    }
}

// Singleton instance
export const dataStore = new DataStore();


