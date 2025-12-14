/**
 * MapyEditor - Main Application
 * Entry point that wires together all layers
 */

// Configuration
import { CONFIG } from './config.js';

// Data layer
import { dataStore } from './models/DataStore.js';

// Storage layer
import { gpxStorage } from './storage/GpxStorage.js';

// Services (logic layer)
import { routingService } from './services/RoutingService.js';
import { routeCalculator } from './services/RouteCalculator.js';

// UI layer
import { mapManager } from './ui/MapManager.js';
import { routeRenderer } from './ui/RouteRenderer.js';
import { contextMenu } from './ui/ContextMenu.js';
import { routesMenu } from './ui/RoutesMenu.js';
import { hoverMarker } from './ui/HoverMarker.js';
import { panelManager } from './ui/PanelManager.js';
import { findRoutesAtPoint } from './services/GeometryUtils.js';

/**
 * Main application controller
 * Coordinates between all layers
 */
class App {
    constructor() {
        this._storage = gpxStorage;
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize UI components
        mapManager.initialize('map');
        contextMenu.initialize();
        routesMenu.initialize();
        panelManager.initialize();
        
        // Set up callbacks
        this._setupRoutingServiceCallbacks();
        this._setupRendererCallbacks();
        this._setupContextMenuCallbacks();
        this._setupRoutesMenuCallbacks();
        this._setupHoverMarkerCallbacks();
        this._setupPanelCallbacks();
        this._setupMapEventHandlers();
        this._setupKeyboardHandlers();
        this._setupDataStoreEventListeners();
        
        // Initial UI update
        this._updateUI();
        
        // Set up beforeunload warning
        window.addEventListener('beforeunload', (e) => {
            if (dataStore.routes.length > 0) {
                const message = 'Skutečně chcete MapyEditor opustit? Máte vše uložené do souboru na disku?';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }
    
    // ==================
    // CALLBACK SETUP
    // ==================
    
    _setupRoutingServiceCallbacks() {
        routingService.setLoadingCallback((loading) => {
            if (loading) {
                panelManager.showLoading();
            } else {
                panelManager.hideLoading();
            }
        });
    }
    
    _setupRendererCallbacks() {
        routeRenderer.setRouteClickCallback((routeId) => {
            this._activateRouteWithBestFit(routeId);
        });
        
        routeRenderer.setRouteHoverCallback((routeId, isHovering) => {
            if (!dataStore.isEditing) {
                routeRenderer.highlightRoute(routeId, isHovering);
            }
        });
        
        routeRenderer.setMarkerDragEndCallback(async (routeId, waypointIndex, latlng) => {
            const route = dataStore.getRoute(routeId);
            if (route) {
                route.waypoints[waypointIndex].lat = latlng.lat;
                route.waypoints[waypointIndex].lon = latlng.lng;
                await routeCalculator.smartRecalculate(route, { operation: 'move', waypointIndex });
                routeRenderer.render(route, true, dataStore.isEditing);
            }
        });
        
        routeRenderer.setMarkerContextMenuCallback((pixel, data) => {
            contextMenu.show(pixel.x, pixel.y, data);
        });
    }
    
    _setupContextMenuCallbacks() {
        contextMenu.setDeleteCallback(async (data) => {
            if (data.type === 'waypoint') {
                await this._deleteWaypoint(data.index);
            }
        });
        
        contextMenu.setSplitCallback(async (data) => {
            if (data.type === 'waypoint') {
                await this._splitRoute(data.index);
            }
        });
        
        contextMenu.setModeChangeCallback(async (data, newMode) => {
            if (data.type === 'waypoint') {
                await this._changeWaypointMode(data.index, newMode);
            }
        });
    }
    
    _setupRoutesMenuCallbacks() {
        routesMenu.setRouteSelectCallback((routeId) => {
            this._activateRouteWithBestFit(routeId);
        });
    }
    
    _setupHoverMarkerCallbacks() {
        hoverMarker.setClickCallback(async (data) => {
            await this._insertMidpoint(data);
        });
    }
    
    _setupPanelCallbacks() {
        panelManager.setCreateRouteCallback(() => {
            this._createNewRoute();
        });
        
        panelManager.setRouteClickCallback((routeId) => {
            this._activateRouteWithBestFit(routeId);
        });
        
        panelManager.setRouteHoverCallback((routeId, isHovering) => {
            if (!dataStore.isEditing) {
                routeRenderer.highlightRoute(routeId, isHovering);
            }
        });
        
        panelManager.setNameChangeCallback((name) => {
            const route = dataStore.activeRoute;
            if (route) {
                route.name = name;
                this._updateUI();
            }
        });
        
        panelManager.setColorChangeCallback((color) => {
            const route = dataStore.activeRoute;
            if (route) {
                route.color = color;
                routeRenderer.render(route, true, dataStore.isEditing);
            }
        });
        
        panelManager.setSaveCallback(() => {
            this._saveRoute();
        });
        
        panelManager.setCancelCallback(() => {
            this._cancelEditing();
        });
        
        panelManager.setImportCallback(async (files) => {
            await this._importFiles(files);
        });
        
        panelManager.setExportCallback(() => {
            this._exportRoutes();
        });
        
        panelManager.setDeleteRouteCallback(() => {
            this._deleteCurrentRoute();
        });
        
        panelManager.setSearchChangeCallback((query) => {
            dataStore.routeSearchQuery = query;
            this._updateRoutesList();
        });
    }
    
    _setupMapEventHandlers() {
        // Mouse move for hover marker
        mapManager.on('mousemove', (e) => {
            const route = dataStore.activeRoute;
            hoverMarker.updatePosition(e.latlng, route, dataStore.isEditing);
        });
        
        // Map click for adding waypoints
        mapManager.on('click', async (e) => {
            await this._handleMapClick(e);
        });
        
        // Right-click for routes menu (when not editing)
        mapManager.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e);
            
            if (!dataStore.isEditing && dataStore.routes.length > 0) {
                // Find routes at this point
                const routeResults = findRoutesAtPoint(
                    e.latlng,
                    dataStore.routes,
                    20, // 20px tolerance
                    mapManager.map
                );
                
                if (routeResults.length > 0) {
                    const pixel = mapManager.latLngToContainerPoint(e.latlng);
                    routesMenu.show(pixel.x, pixel.y, routeResults);
                }
            }
        });
    }
    
    _setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control' || e.ctrlKey) {
                dataStore.ctrlPressed = true;
                this._updateCursor();
            }
            if (e.key === 'Alt' || e.altKey) {
                dataStore.altPressed = true;
                e.preventDefault(); // Prevent menu from appearing
                this._updateCursor();
            }
            // ESC key to cancel editing
            if (e.key === 'Escape' && dataStore.isEditing) {
                this._cancelEditing();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control' || !e.ctrlKey) {
                dataStore.ctrlPressed = false;
                this._updateCursor();
            }
            if (e.key === 'Alt' || !e.altKey) {
                dataStore.altPressed = false;
                this._updateCursor();
            }
        });
        
        window.addEventListener('blur', () => {
            dataStore.ctrlPressed = false;
            dataStore.altPressed = false;
            this._updateCursor();
        });
    }
    
    _setupDataStoreEventListeners() {
        dataStore.on('route:created', () => this._updateRoutesList());
        dataStore.on('route:added', () => this._updateRoutesList());
        dataStore.on('route:deleted', () => this._updateRoutesList());
        dataStore.on('routes:loaded', () => {
            routeRenderer.renderAll(dataStore.routes, dataStore.activeRouteId, dataStore.isEditing);
            this._updateRoutesList();
        });
        dataStore.on('search:changed', () => this._updateRoutesList());
    }
    
    // ==================
    // ROUTE OPERATIONS
    // ==================
    
    _createNewRoute() {
        if (dataStore.isEditing) return;
        
        const route = dataStore.createRoute('Nová trasa', 'red');
        dataStore.activateRoute(route.id);
        routeRenderer.render(route, true, true);
        this._updateUI();
    }
    
    _activateRouteWithBestFit(routeId) {
        if (dataStore.isEditing) return;
        
        const previousActiveId = dataStore.activeRouteId;
        dataStore.activateRoute(routeId);
        
        // Render routes
        if (previousActiveId && previousActiveId !== routeId) {
            const prevRoute = dataStore.getRoute(previousActiveId);
            if (prevRoute) {
                routeRenderer.render(prevRoute, false, false);
            }
        }
        
        const route = dataStore.getRoute(routeId);
        if (route) {
            routeRenderer.render(route, true, true);
            
            // Fit bounds
            if (route.waypoints.length > 0) {
                mapManager.fitBounds(route.waypoints);
            }
        }
        
        this._updateUI();
    }
    
    _saveRoute() {
        const route = dataStore.activeRoute;
        if (route && route.waypoints.length < 2) {
            alert('Trasa musí mít minimálně 2 body.');
            return;
        }
        
        const previousActiveId = dataStore.activeRouteId;
        dataStore.deactivateRoute();
        hoverMarker.hide();
        
        if (previousActiveId) {
            const route = dataStore.getRoute(previousActiveId);
            if (route) {
                routeRenderer.render(route, false, false);
            }
        }
        
        this._updateUI();
    }
    
    _cancelEditing() {
        const route = dataStore.activeRoute;
        if (!route) {
            dataStore.deactivateRoute();
            this._updateUI();
            return;
        }
        
        // Check if there are changes to confirm
        if (dataStore.hasChanges()) {
            if (!confirm('Opravdu zrušit změny provedené v trase?')) {
                return;
            }
        }
        
        const routeId = dataStore.activeRouteId;
        const wasNewRoute = !dataStore.routeBackup || dataStore.routeBackup.waypoints.length < 2;
        
        dataStore.cancelEditing();
        hoverMarker.hide();
        
        if (wasNewRoute) {
            // Route was deleted
            mapManager.removeRouteLayers(routeId);
        } else {
            // Route was restored
            const restoredRoute = dataStore.getRoute(routeId);
            if (restoredRoute) {
                routeRenderer.render(restoredRoute, false, false);
            }
        }
        
        this._updateUI();
    }
    
    _deleteCurrentRoute() {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        if (!confirm(`Opravdu chcete smazat trasu "${route.name}"?`)) {
            return;
        }
        
        const routeId = dataStore.activeRouteId;
        mapManager.removeRouteLayers(routeId);
        dataStore.deleteRoute(routeId);
        hoverMarker.hide();
        this._updateUI();
    }
    
    async _deleteWaypoint(index) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        if (route.waypoints.length <= 2) {
            alert('Trasa musí mít minimálně 2 body.');
            return;
        }
        
        route.waypoints.splice(index, 1);
        await routeCalculator.smartRecalculate(route, { operation: 'delete' });
        routeRenderer.render(route, true, true);
        this._updateUI();
    }
    
    async _splitRoute(index) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        if (index === 0 || index === route.waypoints.length - 1) {
            alert('Nelze rozdělit trasu na prvním nebo posledním bodě.');
            return;
        }
        
        // Create second route with waypoints from split point
        const wp2 = route.waypoints.slice(index);
        wp2[0] = { ...wp2[0], mode: 'start' };
        
        // Truncate original route
        route.waypoints = route.waypoints.slice(0, index + 1);
        
        // Recalculate original route
        await routeCalculator.recalculateRouteGeometry(route);
        
        // Create and calculate new route
        const newRoute = dataStore.createRoute(route.name + ' (2)', route.color);
        newRoute.waypoints = wp2;
        await routeCalculator.recalculateRouteGeometry(newRoute);
        
        // Exit editing mode
        dataStore.deactivateRoute();
        hoverMarker.hide();
        
        // Render all routes
        routeRenderer.renderAll(dataStore.routes, null, false);
        this._updateUI();
    }
    
    async _changeWaypointMode(index, newMode) {
        const route = dataStore.activeRoute;
        if (!route || index === 0) return;
        
        route.waypoints[index].mode = newMode;
        await routeCalculator.recalculateRouteGeometry(route);
        routeRenderer.render(route, true, true);
        this._updateUI();
    }
    
    async _insertMidpoint(data) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const { lat, lon, insertIndex, mode, segmentIndex } = data;
        
        // Validate insert index
        if (insertIndex < 1 || insertIndex > route.waypoints.length) {
            console.error('Invalid insert index:', insertIndex);
            return;
        }
        
        // Insert the new waypoint
        route.waypoints.splice(insertIndex, 0, {
            lat: lat,
            lon: lon,
            mode: mode
        });
        
        hoverMarker.hide();
        
        // Recalculate
        await routeCalculator.smartRecalculate(route, { operation: 'insert', waypointIndex: insertIndex, segmentIndex });
        routeRenderer.render(route, true, true);
        this._updateUI();
    }
    
    async _handleMapClick(e) {
        if (!dataStore.isEditing || !dataStore.activeRouteId) return;
        
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const clickedLat = e.latlng.lat;
        const clickedLon = e.latlng.lng;
        
        if (route.waypoints.length === 0) {
            // Add start point (no modifier needed)
            route.waypoints.push({
                lat: clickedLat,
                lon: clickedLon,
                mode: 'start'
            });
            routeRenderer.render(route, true, true);
            this._updateUI();
        } else if (dataStore.ctrlPressed) {
            // Add routing waypoint
            route.waypoints.push({
                lat: clickedLat,
                lon: clickedLon,
                mode: 'routing'
            });
            await routeCalculator.smartRecalculate(route, { operation: 'append', waypointIndex: route.waypoints.length - 1 });
            routeRenderer.render(route, true, true);
            this._updateUI();
        } else if (dataStore.altPressed) {
            // Add manual waypoint
            route.waypoints.push({
                lat: clickedLat,
                lon: clickedLon,
                mode: 'manual'
            });
            await routeCalculator.smartRecalculate(route, { operation: 'append', waypointIndex: route.waypoints.length - 1 });
            routeRenderer.render(route, true, true);
            this._updateUI();
        }
    }
    
    // ==================
    // IMPORT/EXPORT
    // ==================
    
    async _importFiles(files) {
        if (dataStore.isEditing) return;
        
        panelManager.showImportLoading();
        
        try {
            const routes = await this._storage.loadAll(files);
            routes.forEach(route => {
                dataStore.addRoute(route);
            });
            
            routeRenderer.renderAll(dataStore.routes, dataStore.activeRouteId, dataStore.isEditing);
            this._updateRoutesList();
            
            // Fit bounds to all routes
            const allCoords = [];
            dataStore.routes.forEach(route => {
                route.waypoints.forEach(wp => allCoords.push(wp));
            });
            if (allCoords.length > 0) {
                mapManager.fitBounds(allCoords);
            }
        } finally {
            panelManager.hideImportLoading();
            setTimeout(() => {
                panelManager.hideImportPanel();
            }, 500);
        }
    }
    
    _exportRoutes() {
        if (dataStore.routes.length === 0) {
            alert('Žádné trasy k exportu');
            return;
        }
        
        this._storage.saveAll(dataStore.routes);
    }
    
    // ==================
    // UI UPDATES
    // ==================
    
    _updateUI() {
        panelManager.updateUI({
            isEditing: dataStore.isEditing,
            activeRoute: dataStore.activeRoute
        });
        
        if (!dataStore.isEditing) {
            this._updateRoutesList();
        }
        
        this._updateCursor();
    }
    
    _updateRoutesList() {
        panelManager.updateRoutesList(dataStore.routes, dataStore.getFilteredRoutes());
    }
    
    _updateCursor() {
        const route = dataStore.activeRoute;
        
        if (dataStore.isEditing && route) {
            if (route.waypoints.length === 0) {
                mapManager.setCursorMode('add-start-mode');
            } else if (dataStore.ctrlPressed) {
                mapManager.setCursorMode('add-routing-mode');
            } else if (dataStore.altPressed) {
                mapManager.setCursorMode('add-manual-mode');
            } else {
                mapManager.setCursorMode('default');
            }
        } else {
            mapManager.setCursorMode('default');
        }
    }
}

// Create and initialize app
const app = new App();

// Export for potential external access
export { app };

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}


