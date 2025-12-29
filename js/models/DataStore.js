/**
 * MapyEditor - DataStore
 * Central data store with event emission for reactive updates
 * 
 * Updated for independent segments - each segment has its own waypoints
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
 * Segment model - independent unit with its own waypoints and geometry
 * 
 * For routing segments:
 * - waypoints are control points (start, via points, end)
 * - geometry is calculated from API (snapped to road network)
 * 
 * For manual segments:
 * - waypoints ARE the geometry (straight lines between them)
 * - geometry = waypoints
 */
export class Segment {
    constructor(data = {}) {
        this.mode = data.mode || 'routing';  // 'routing' or 'manual'
        this.waypoints = data.waypoints || [];  // [{lat, lon}, ...]
        this.geometry = data.geometry || [];    // [{lat, lon}, ...]
    }
    
    /**
     * Check if segment is valid (has at least 2 waypoints)
     * @returns {boolean}
     */
    isValid() {
        return this.waypoints.length >= 2;
    }
    
    /**
     * Get the start point of the segment
     * @returns {Object|null} {lat, lon} or null if no waypoints
     */
    getStart() {
        return this.waypoints.length > 0 ? this.waypoints[0] : null;
    }
    
    /**
     * Get the end point of the segment
     * @returns {Object|null} {lat, lon} or null if no waypoints
     */
    getEnd() {
        return this.waypoints.length > 0 ? this.waypoints[this.waypoints.length - 1] : null;
    }
    
    /**
     * Clone the segment
     * @returns {Segment}
     */
    clone() {
        return new Segment({
            mode: this.mode,
            waypoints: this.waypoints.map(wp => ({ ...wp })),
            geometry: this.geometry.map(g => ({ ...g }))
        });
    }
    
    /**
     * Serialize to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            mode: this.mode,
            waypoints: this.waypoints,
            geometry: this.geometry
        };
    }
}

/**
 * Route model with OSM-like attributes and independent segments
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
        
        // OSM-like attributes
        this.routeType = data.routeType || 'Hiking';
        this.color = data.color || null;
        this.customColor = data.customColor || null;
        this.symbol = data.symbol || null;
        this.name = data.name || null;
        this.ref = data.ref || null;
        this.network = data.network || 'Nwn';
        this.wikidata = data.wikidata || null;
        this.customData = data.customData || null;
        
        // Segments - each with its own waypoints and geometry
        this.segments = (data.segments || []).map(seg => 
            seg instanceof Segment ? seg : new Segment(seg)
        );
    }
    
    /**
     * Get display title for the route
     * - If both ref and name are filled: "ref - name"
     * - If only one is filled: that value without dash
     * - If neither is filled: "noname"
     * @returns {string}
     */
    getTitle() {
        const hasRef = this.ref && this.ref.trim() !== '';
        const hasName = this.name && this.name.trim() !== '';
        
        if (hasRef && hasName) {
            return `${this.ref} - ${this.name}`;
        } else if (hasRef) {
            return this.ref;
        } else if (hasName) {
            return this.name;
        } else {
            return 'noname';
        }
    }
    
    /**
     * Get display subtitle for the route
     * Shows route type in Czech and segment count
     * @returns {string}
     */
    getSubtitle() {
        const routeTypeLabel = getEnumLabel(ROUTE_TYPE_ENUM, this.routeType);
        const segmentCount = this.segments.length;
        const segmentText = segmentCount === 1 ? '1 segment' : `${segmentCount} segmentů`;
        return `${routeTypeLabel} • ${segmentText}`;
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
     * Get total waypoint count across all segments
     * @returns {number}
     */
    getTotalWaypointCount() {
        return this.segments.reduce((sum, seg) => sum + seg.waypoints.length, 0);
    }
    
    /**
     * Get count of valid segments (with at least 2 waypoints)
     * @returns {number}
     */
    getValidSegmentCount() {
        return this.segments.filter(seg => seg.isValid()).length;
    }
    
    /**
     * Check if route has any valid segments
     * @returns {boolean}
     */
    hasValidSegments() {
        return this.getValidSegmentCount() > 0;
    }
    
    /**
     * Add a new empty segment
     * @param {string} mode - 'routing' or 'manual', default 'routing'
     * @returns {number} Index of the new segment
     */
    addSegment(mode = 'routing') {
        const segment = new Segment({ mode });
        this.segments.push(segment);
        return this.segments.length - 1;
    }
    
    /**
     * Remove segment at index
     * @param {number} index
     * @returns {boolean} Success
     */
    removeSegment(index) {
        if (index >= 0 && index < this.segments.length) {
            this.segments.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Get segment at index
     * @param {number} index
     * @returns {Segment|null}
     */
    getSegment(index) {
        return this.segments[index] || null;
    }
    
    /**
     * Remove all invalid segments (less than 2 waypoints)
     * @returns {number} Number of removed segments
     */
    removeInvalidSegments() {
        const initialCount = this.segments.length;
        this.segments = this.segments.filter(seg => seg.isValid());
        return initialCount - this.segments.length;
    }
    
    /**
     * Get all attribute names for comparison/backup
     * @returns {Array<string>}
     */
    static getAttributeNames() {
        return ['routeType', 'color', 'customColor', 'symbol', 'name', 'ref', 'network', 'wikidata', 'customData'];
    }
    
    /**
     * Clone the route (deep copy)
     * @returns {Route}
     */
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
            segments: this.segments.map(seg => seg.clone())
        });
    }
    
    /**
     * Serialize to JSON
     * @returns {Object}
     */
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
            segments: this.segments.map(seg => seg.toJSON())
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
        this._activeSegmentIndex = null;  // Which segment of active route is being edited
        this._isViewingDetail = false;    // Viewing detail mode (read-only)
        this._isEditing = false;          // Editing mode
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
    
    get activeSegmentIndex() {
        return this._activeSegmentIndex;
    }
    
    get activeSegment() {
        const route = this.activeRoute;
        if (!route || this._activeSegmentIndex === null) return null;
        return route.getSegment(this._activeSegmentIndex);
    }
    
    get isViewingDetail() {
        return this._isViewingDetail;
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
     * Create a new route with one empty segment
     * @returns {Route}
     */
    createRoute() {
        const route = new Route({
            id: this._nextRouteId++,
            routeType: 'Hiking',
            color: null,
            name: null,
            ref: null,
            network: 'Nwn',
            segments: [new Segment({ mode: 'routing' })]  // Start with one empty routing segment
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
            this._activeSegmentIndex = null;
            this._isViewingDetail = false;
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
        this._activeSegmentIndex = null;
        this._isViewingDetail = false;
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
    // ACTIVE ROUTE / DETAIL / EDITING
    // ==================
    
    /**
     * Open a route in detail view (read-only)
     * @param {number} id - Route ID
     * @returns {boolean} Success
     */
    openDetail(id) {
        if (this._isEditing) return false;
        
        const route = this.getRoute(id);
        if (!route) return false;
        
        const previousActiveId = this._activeRouteId;
        this._activeRouteId = id;
        this._isViewingDetail = true;
        this._activeSegmentIndex = null;
        
        this.emit('route:detailOpened', { route, previousActiveId });
        return true;
    }
    
    /**
     * Close detail view and return to list
     */
    closeDetail() {
        if (!this._isViewingDetail) return;
        
        const route = this.activeRoute;
        this._activeRouteId = null;
        this._isViewingDetail = false;
        this._activeSegmentIndex = null;
        
        this.emit('route:detailClosed', { route });
    }
    
    /**
     * Start editing the route currently in detail view
     * Creates a backup and activates first segment
     * @returns {boolean} Success
     */
    startEditing() {
        if (!this._isViewingDetail || this._isEditing) return false;
        
        const route = this.activeRoute;
        if (!route) return false;
        
        this._isViewingDetail = false;
        this._isEditing = true;
        
        // Create backup
        this._routeBackup = route.clone();
        
        // Activate first segment or create one if none
        if (route.segments.length === 0) {
            route.addSegment('routing');
        }
        this._activeSegmentIndex = 0;
        
        this.emit('route:editingStarted', { route, segmentIndex: 0 });
        return true;
    }
    
    /**
     * Activate a route for editing (for new routes, bypasses detail)
     * Automatically activates the first segment (or creates one if none exist)
     * @param {number} id - Route ID
     * @returns {boolean} Success
     */
    activateRoute(id) {
        if (this._isEditing) return false;
        
        const route = this.getRoute(id);
        if (!route) return false;
        
        const previousActiveId = this._activeRouteId;
        this._activeRouteId = id;
        this._isViewingDetail = false;
        this._isEditing = true;
        
        // Create backup
        this._routeBackup = route.clone();
        
        // Activate first segment or create one if none
        if (route.segments.length === 0) {
            route.addSegment('routing');
        }
        this._activeSegmentIndex = 0;
        
        this.emit('route:activated', { route, previousActiveId, segmentIndex: 0 });
        return true;
    }
    
    /**
     * Switch to editing a different segment of the active route
     * Discards the current segment if invalid
     * @param {number} segmentIndex - Index of segment to activate
     * @returns {boolean} Success
     */
    setActiveSegment(segmentIndex) {
        const route = this.activeRoute;
        if (!route || !this._isEditing) return false;
        
        if (segmentIndex < 0 || segmentIndex >= route.segments.length) return false;
        
        // Discard current segment if invalid
        const currentSegment = this.activeSegment;
        if (currentSegment && !currentSegment.isValid()) {
            route.removeSegment(this._activeSegmentIndex);
            // Adjust index if we removed a segment before the new target
            if (this._activeSegmentIndex < segmentIndex) {
                segmentIndex--;
            }
        }
        
        // Make sure the index is still valid after potential removal
        if (segmentIndex >= route.segments.length) {
            segmentIndex = route.segments.length - 1;
        }
        if (segmentIndex < 0) {
            // No segments left - create a new one
            route.addSegment('routing');
            segmentIndex = 0;
        }
        
        this._activeSegmentIndex = segmentIndex;
        this.emit('segment:activated', { route, segmentIndex });
        return true;
    }
    
    /**
     * Add a new segment to the active route and activate it
     * Discards the current segment if invalid
     * @param {string} mode - 'routing' or 'manual', default 'routing'
     * @returns {number|null} Index of new segment or null if failed
     */
    addNewSegment(mode = 'routing') {
        const route = this.activeRoute;
        if (!route || !this._isEditing) return null;
        
        // Discard current segment if invalid
        const currentSegment = this.activeSegment;
        if (currentSegment && !currentSegment.isValid()) {
            route.removeSegment(this._activeSegmentIndex);
        }
        
        // Add new segment
        const newIndex = route.addSegment(mode);
        this._activeSegmentIndex = newIndex;
        
        this.emit('segment:created', { route, segmentIndex: newIndex });
        return newIndex;
    }
    
    /**
     * Delete a segment from the active route
     * If it's the last segment, creates a new empty one
     * @param {number} segmentIndex - Index of segment to delete
     * @returns {boolean} Success
     */
    deleteSegment(segmentIndex) {
        const route = this.activeRoute;
        if (!route || !this._isEditing) return false;
        
        if (segmentIndex < 0 || segmentIndex >= route.segments.length) return false;
        
        route.removeSegment(segmentIndex);
        
        // If no segments left, create a new empty one
        if (route.segments.length === 0) {
            route.addSegment('routing');
            this._activeSegmentIndex = 0;
        } else {
            // Adjust active segment index
            if (this._activeSegmentIndex >= route.segments.length) {
                this._activeSegmentIndex = route.segments.length - 1;
            } else if (this._activeSegmentIndex > segmentIndex) {
                this._activeSegmentIndex--;
            }
        }
        
        this.emit('segment:deleted', { route, deletedIndex: segmentIndex, newActiveIndex: this._activeSegmentIndex });
        return true;
    }
    
    /**
     * Save editing and return to detail view
     * @returns {boolean} Success - true if route was saved, false if no valid segments
     */
    saveEditing() {
        const route = this.activeRoute;
        if (!route || !this._isEditing) return false;
        
        // Remove invalid segments before saving
        route.removeInvalidSegments();
        
        // Check if route has any valid segments
        if (!route.hasValidSegments()) {
            return false;  // Cannot save - no valid segments
        }
        
        // Switch from editing to detail view
        this._isEditing = false;
        this._isViewingDetail = true;
        this._activeSegmentIndex = null;
        this._routeBackup = null;
        
        this.emit('route:saved', { route });
        return true;
    }
    
    /**
     * Deactivate current route completely (for legacy/internal use)
     */
    deactivateRoute() {
        const previousActiveId = this._activeRouteId;
        const route = this.activeRoute;
        
        // Remove invalid segments before saving
        if (route) {
            route.removeInvalidSegments();
        }
        
        this._activeRouteId = null;
        this._activeSegmentIndex = null;
        this._isViewingDetail = false;
        this._isEditing = false;
        this._routeBackup = null;
        
        this.emit('route:deactivated', { route, previousActiveId });
    }
    
    /**
     * Cancel editing and restore backup
     * - For new routes: deletes route and goes to list
     * - For existing routes: restores backup and goes to detail
     */
    cancelEditing() {
        const route = this.activeRoute;
        if (!route) {
            this.deactivateRoute();
            return;
        }
        
        // Check if this is a new route (backup had no valid segments)
        const isNewRoute = !this._routeBackup || !this._routeBackup.hasValidSegments();
        
        if (isNewRoute) {
            // New route - delete it completely and go to list
            this.deleteRoute(this._activeRouteId);
            // deleteRoute already handles cleanup
        } else {
            // Existing route - restore all attributes and segments from backup
            Route.getAttributeNames().forEach(attr => {
                route[attr] = this._routeBackup[attr];
            });
            route.segments = this._routeBackup.segments.map(seg => seg.clone());
            
            // Go back to detail view
            this._isEditing = false;
            this._isViewingDetail = true;
            this._activeSegmentIndex = null;
            this._routeBackup = null;
            
            this.emit('route:editingCancelled', { route });
        }
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
        
        // Check segments count
        if (route.segments.length !== this._routeBackup.segments.length) {
            return true;
        }
        
        // Check each segment
        for (let i = 0; i < route.segments.length; i++) {
            const seg = route.segments[i];
            const backupSeg = this._routeBackup.segments[i];
            
            if (seg.mode !== backupSeg.mode) {
                return true;
            }
            
            if (seg.waypoints.length !== backupSeg.waypoints.length) {
                return true;
            }
            
            // Check waypoints content
            for (let j = 0; j < seg.waypoints.length; j++) {
                const wp = seg.waypoints[j];
                const backupWp = backupSeg.waypoints[j];
                
                if (Math.abs(wp.lat - backupWp.lat) > 0.000001 ||
                    Math.abs(wp.lon - backupWp.lon) > 0.000001) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

// Singleton instance
export const dataStore = new DataStore();
