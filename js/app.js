/**
 * MapyEditor - Main Application
 * Entry point that wires together all layers
 * 
 * Updated for independent segments
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
        this._setupTopToolbar();
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
    
    _setupTopToolbar() {
        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenu = document.getElementById('user-menu');
        const userMenuContainer = userMenuBtn?.closest('.user-menu-container');
        
        if (userMenuBtn && userMenu && userMenuContainer) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenuContainer.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuContainer.contains(e.target)) {
                    userMenuContainer.classList.remove('active');
                }
            });
            
            // Prevent menu items from doing anything (prototype)
            const menuItems = userMenu.querySelectorAll('.user-menu-item');
            menuItems.forEach(item => {
                if (item.id === 'user-menu-settings' || item.id === 'user-menu-logout') {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Do nothing for prototype
                    });
                }
            });
        }
        
        // Source selector (prototype - no action)
        const sourceSelect = document.getElementById('source-select');
        if (sourceSelect) {
            sourceSelect.addEventListener('change', (e) => {
                // Do nothing for prototype - just prevent default behavior if needed
            });
        }
    }
    
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
        routeRenderer.setRouteClickCallback((routeId, latlng) => {
            // Detect all routes at click point
            const routeResults = findRoutesAtPoint(
                latlng,
                dataStore.routes,
                20, // 20px tolerance
                mapManager.map
            );
            
            if (routeResults.length === 0) {
                return;
            } else if (routeResults.length === 1) {
                // Single route - open detail directly
                this._openRouteDetail(routeResults[0].route.id);
            } else {
                // Multiple routes - show menu
                const pixel = mapManager.latLngToContainerPoint(latlng);
                routesMenu.show(pixel.x, pixel.y, routeResults);
            }
        });
        
        routeRenderer.setRouteHoverCallback((routeId, isHovering) => {
            // Don't change highlight in editing mode or for the active route in detail mode
            if (dataStore.isEditing) return;
            if (dataStore.isViewingDetail && dataStore.activeRouteId === routeId) return;
            routeRenderer.highlightRoute(routeId, isHovering);
        });
        
        routeRenderer.setSegmentClickCallback((routeId, segmentIndex, latlng) => {
            // Switch to editing this segment
            if (dataStore.activeRouteId === routeId && dataStore.isEditing) {
                this._switchToSegment(segmentIndex);
            }
        });
        
        routeRenderer.setMarkerDragEndCallback(async (routeId, segmentIndex, waypointIndex, latlng) => {
            const route = dataStore.getRoute(routeId);
            if (route && route.segments[segmentIndex]) {
                const segment = route.segments[segmentIndex];
                await routeCalculator.moveWaypoint(segment, waypointIndex, latlng.lat, latlng.lng);
                this._renderActiveRoute();
            }
        });
        
        routeRenderer.setMarkerContextMenuCallback((pixel, data) => {
            // Add waypoint count to data for mode change validation
            const route = dataStore.activeRoute;
            if (route && route.segments[data.segmentIndex]) {
                data.waypointCount = route.segments[data.segmentIndex].waypoints.length;
            }
            contextMenu.show(pixel.x, pixel.y, data);
        });
    }
    
    _setupContextMenuCallbacks() {
        contextMenu.setDeleteCallback(async (data) => {
            if (data.type === 'waypoint') {
                await this._deleteWaypoint(data.segmentIndex, data.waypointIndex);
            }
        });
        
        contextMenu.setModeChangeCallback(async (data, newMode) => {
            if (data.type === 'waypoint') {
                await this._changeSegmentMode(data.segmentIndex, newMode);
            }
        });
    }
    
    _setupRoutesMenuCallbacks() {
        routesMenu.setRouteSelectCallback((routeId) => {
            this._openRouteDetail(routeId);
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
            this._openRouteDetail(routeId);
        });
        
        panelManager.setRouteHoverCallback((routeId, isHovering) => {
            // Don't change highlight in editing mode or for the active route in detail mode
            if (dataStore.isEditing) return;
            if (dataStore.isViewingDetail && dataStore.activeRouteId === routeId) return;
            routeRenderer.highlightRoute(routeId, isHovering);
        });
        
        panelManager.setAttributeChangeCallback((attr, value) => {
            const route = dataStore.activeRoute;
            if (route) {
                route[attr] = value;
                // Re-render if color-related attribute changed
                if (attr === 'color' || attr === 'customColor') {
                    this._renderActiveRoute();
                }
                this._updateUI();
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
        
        panelManager.setCopyRouteCallback(() => {
            this._copyCurrentRoute();
        });
        
        panelManager.setSearchChangeCallback((query) => {
            dataStore.routeSearchQuery = query;
            this._updateRoutesList();
        });
        
        // Segment callbacks
        panelManager.setSegmentClickCallback((segmentIndex) => {
            this._switchToSegment(segmentIndex);
        });
        
        panelManager.setAddSegmentCallback(() => {
            this._addNewSegment();
        });
        
        panelManager.setDeleteSegmentCallback((segmentIndex) => {
            this._deleteSegment(segmentIndex);
        });
        
        panelManager.setChangeSegmentModeCallback(async (segmentIndex, newMode) => {
            await this._changeSegmentMode(segmentIndex, newMode);
        });
        
        // Detail panel callbacks
        panelManager.setCloseDetailCallback(() => {
            this._closeDetail();
        });
        
        panelManager.setStartEditingCallback(() => {
            this._startEditingFromDetail();
        });
    }
    
    _setupMapEventHandlers() {
        // Mouse move for hover marker
        mapManager.on('mousemove', (e) => {
            const segment = dataStore.activeSegment;
            const segmentIndex = dataStore.activeSegmentIndex;
            hoverMarker.updatePosition(e.latlng, segment, segmentIndex, dataStore.isEditing);
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
            // ESC key to cancel editing or close detail
            if (e.key === 'Escape') {
                if (dataStore.isEditing) {
                    this._cancelEditing();
                } else if (dataStore.isViewingDetail) {
                    this._closeDetail();
                }
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
            routeRenderer.renderAll(dataStore.routes, dataStore.activeRouteId, dataStore.isEditing, dataStore.activeSegmentIndex);
            this._updateRoutesList();
        });
        dataStore.on('search:changed', () => this._updateRoutesList());
    }
    
    // ==================
    // ROUTE OPERATIONS
    // ==================
    
    _createNewRoute() {
        if (dataStore.isEditing) return;
        
        const route = dataStore.createRoute();
        dataStore.activateRoute(route.id);
        this._renderActiveRoute();
        panelManager.resetFormState();
        this._updateUI();
    }
    
    /**
     * Open route in detail view (read-only)
     */
    _openRouteDetail(routeId) {
        if (dataStore.isEditing) return;
        
        const previousActiveId = dataStore.activeRouteId;
        
        // If already viewing another route's detail, close it first
        if (dataStore.isViewingDetail && previousActiveId && previousActiveId !== routeId) {
            const prevRoute = dataStore.getRoute(previousActiveId);
            if (prevRoute) {
                routeRenderer.render(prevRoute, false, false, null);
            }
        }
        
        dataStore.openDetail(routeId);
        
        const route = dataStore.getRoute(routeId);
        if (route) {
            // Highlight the route (thicker line like hover)
            routeRenderer.highlightRoute(routeId, true);
            
            // Fit bounds to all segments
            const allCoords = [];
            route.segments.forEach(seg => {
                seg.waypoints.forEach(wp => allCoords.push(wp));
            });
            if (allCoords.length > 0) {
                mapManager.fitBounds(allCoords);
            }
        }
        
        this._updateUI();
    }
    
    /**
     * Close detail view and return to list
     */
    _closeDetail() {
        if (!dataStore.isViewingDetail) return;
        
        const route = dataStore.activeRoute;
        if (route) {
            // Unhighlight the route
            routeRenderer.highlightRoute(route.id, false);
        }
        
        dataStore.closeDetail();
        this._updateUI();
    }
    
    /**
     * Start editing from detail view
     */
    _startEditingFromDetail() {
        if (!dataStore.isViewingDetail) return;
        
        const routeId = dataStore.activeRouteId;
        dataStore.startEditing();
        
        this._renderActiveRoute();
        panelManager.resetFormState();
        this._updateUI();
    }
    
    /**
     * Activate route directly for editing (used for new routes)
     * @private
     */
    _activateRouteWithBestFit(routeId) {
        if (dataStore.isEditing) return;
        
        const previousActiveId = dataStore.activeRouteId;
        dataStore.activateRoute(routeId);
        
        // Render routes
        if (previousActiveId && previousActiveId !== routeId) {
            const prevRoute = dataStore.getRoute(previousActiveId);
            if (prevRoute) {
                routeRenderer.render(prevRoute, false, false, null);
            }
        }
        
        const route = dataStore.getRoute(routeId);
        if (route) {
            this._renderActiveRoute();
            
            // Fit bounds to all segments
            const allCoords = [];
            route.segments.forEach(seg => {
                seg.waypoints.forEach(wp => allCoords.push(wp));
            });
            if (allCoords.length > 0) {
                mapManager.fitBounds(allCoords);
            }
        }
        
        panelManager.resetFormState();
        this._updateUI();
    }
    
    _switchToSegment(segmentIndex) {
        if (!dataStore.isEditing) return;
        
        // Hide hover marker to prevent accidental midpoint insertion
        hoverMarker.hide();
        
        dataStore.setActiveSegment(segmentIndex);
        this._renderActiveRoute();
        this._updateUI();
    }
    
    _addNewSegment() {
        if (!dataStore.isEditing) return;
        
        dataStore.addNewSegment('routing');
        this._renderActiveRoute();
        this._updateUI();
    }
    
    _deleteSegment(segmentIndex) {
        if (!dataStore.isEditing) return;
        
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const segment = route.segments[segmentIndex];
        const segmentName = segment ? `Segment ${segmentIndex + 1}` : 'Segment';
        
        if (!confirm(`Opravdu chcete smazat ${segmentName}?`)) {
            return;
        }
        
        dataStore.deleteSegment(segmentIndex);
        this._renderActiveRoute();
        this._updateUI();
    }
    
    _saveRoute() {
        const route = dataStore.activeRoute;
        if (!route) {
            dataStore.deactivateRoute();
            this._updateUI();
            return;
        }
        
        // Try to save (goes to detail view)
        const saved = dataStore.saveEditing();
        
        if (!saved) {
            // No valid segments
            alert('Trasa musí mít alespoň jeden segment s minimálně 2 body.');
            return;
        }
        
        hoverMarker.hide();
        
        // Re-render route (unhighlighted, but keep it visible)
        const savedRoute = dataStore.activeRoute;
        if (savedRoute) {
            routeRenderer.render(savedRoute, false, false, null);
            // Highlight the route in detail view
            routeRenderer.highlightRoute(savedRoute.id, true);
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
        const wasNewRoute = !dataStore.routeBackup || !dataStore.routeBackup.hasValidSegments();
        
        dataStore.cancelEditing();
        hoverMarker.hide();
        
        if (wasNewRoute) {
            // Route was deleted - go to list
            mapManager.removeRouteLayers(routeId);
        } else {
            // Route was restored - go to detail view (dataStore.cancelEditing sets isViewingDetail)
            const restoredRoute = dataStore.getRoute(routeId);
            if (restoredRoute) {
                routeRenderer.render(restoredRoute, false, false, null);
                // Highlight the route in detail view
                routeRenderer.highlightRoute(routeId, true);
            }
        }
        
        this._updateUI();
    }
    
    _deleteCurrentRoute() {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const title = route.getTitle();
        if (!confirm(`Opravdu chcete smazat trasu "${title}"?`)) {
            return;
        }
        
        const routeId = dataStore.activeRouteId;
        mapManager.removeRouteLayers(routeId);
        dataStore.deleteRoute(routeId);
        hoverMarker.hide();
        this._updateUI();
    }
    
    _copyCurrentRoute() {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        // Check if route has any valid segments
        if (!route.hasValidSegments()) {
            alert('Trasa musí mít alespoň jeden segment s minimálně 2 body pro vytvoření kopie.');
            return;
        }
        
        // Close the current route (detail or editing)
        const previousActiveId = dataStore.activeRouteId;
        if (dataStore.isViewingDetail) {
            // Unhighlight current route
            routeRenderer.highlightRoute(previousActiveId, false);
            dataStore.closeDetail();
        } else if (dataStore.isEditing) {
            route.removeInvalidSegments();
            dataStore.deactivateRoute();
            hoverMarker.hide();
            // Render the saved route as inactive
            const savedRoute = dataStore.getRoute(previousActiveId);
            if (savedRoute) {
                routeRenderer.render(savedRoute, false, false, null);
            }
        }
        
        // Create a copy from the original route
        const originalRoute = dataStore.getRoute(previousActiveId);
        if (!originalRoute) return;
        
        const copiedRoute = originalRoute.clone();
        copiedRoute.id = null;
        
        // Modify the name
        if (copiedRoute.name) {
            copiedRoute.name = copiedRoute.name + ' (kopie)';
        } else if (copiedRoute.ref) {
            copiedRoute.name = copiedRoute.ref + ' (kopie)';
        } else {
            copiedRoute.name = 'noname (kopie)';
        }
        
        // Add the copied route
        const newRoute = dataStore.addRoute(copiedRoute);
        
        // Render the new route
        routeRenderer.render(newRoute, false, false, null);
        
        // Open detail of the new route
        this._openRouteDetail(newRoute.id);
    }
    
    // ==================
    // WAYPOINT OPERATIONS
    // ==================
    
    async _deleteWaypoint(segmentIndex, waypointIndex) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const segment = route.segments[segmentIndex];
        if (!segment) return;
        
        // Check if this would leave segment with less than 2 waypoints
        if (segment.waypoints.length <= 2) {
            // Ask to delete the whole segment instead
            if (confirm('Smazáním tohoto bodu by segment měl méně než 2 body. Chcete smazat celý segment?')) {
                this._deleteSegment(segmentIndex);
            }
            return;
        }
        
        await routeCalculator.deleteWaypoint(segment, waypointIndex);
        this._renderActiveRoute();
        this._updateUI();
    }
    
    async _changeSegmentMode(segmentIndex, newMode) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const segment = route.segments[segmentIndex];
        if (!segment) return;
        
        if (newMode === 'routing') {
            // Check waypoint limit
            if (segment.waypoints.length > CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
                alert(`Segment má více než ${CONFIG.MAX_WAYPOINTS_PER_API_CALL} bodů a nelze ho změnit na plánovaný.`);
                return;
            }
            
            const success = await routeCalculator.changeToRouting(segment);
            if (!success) {
                alert('Nepodařilo se změnit segment na plánovaný.');
                return;
            }
        } else {
            routeCalculator.changeToManual(segment);
        }
        
        this._renderActiveRoute();
        this._updateUI();
    }
    
    async _insertMidpoint(data) {
        const route = dataStore.activeRoute;
        if (!route) return;
        
        const { lat, lon, insertIndex, segmentIndex } = data;
        const segment = route.segments[segmentIndex];
        
        if (!segment) return;
        
        // Validate insert index
        if (insertIndex < 0 || insertIndex > segment.waypoints.length) {
            console.error('Invalid insert index:', insertIndex);
            return;
        }
        
        hoverMarker.hide();
        
        // Insert the new waypoint
        await routeCalculator.insertWaypoint(segment, insertIndex, lat, lon);
        
        this._renderActiveRoute();
        this._updateUI();
    }
    
    async _handleMapClick(e) {
        if (!dataStore.isEditing || !dataStore.activeRouteId) return;
        
        const route = dataStore.activeRoute;
        const segment = dataStore.activeSegment;
        if (!route || !segment) return;
        
        const clickedLat = e.latlng.lat;
        const clickedLon = e.latlng.lng;
        
        if (segment.waypoints.length === 0) {
            // Add start point (no modifier needed for first point)
            segment.waypoints.push({ lat: clickedLat, lon: clickedLon });
            // For single point, no geometry yet
            this._renderActiveRoute();
            this._updateUI();
        } else if (dataStore.ctrlPressed) {
            // Add waypoint to end of segment
            await routeCalculator.addWaypoint(segment, clickedLat, clickedLon);
            this._renderActiveRoute();
            this._updateUI();
        }
        // Note: We removed ALT for manual since mode is now per-segment, not per-waypoint
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
            
            routeRenderer.renderAll(dataStore.routes, dataStore.activeRouteId, dataStore.isEditing, dataStore.activeSegmentIndex);
            this._updateRoutesList();
            
            // Fit bounds to all routes
            const allCoords = [];
            dataStore.routes.forEach(route => {
                route.segments.forEach(seg => {
                    seg.waypoints.forEach(wp => allCoords.push(wp));
                });
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
    
    _renderActiveRoute() {
        const route = dataStore.activeRoute;
        if (route) {
            routeRenderer.render(route, true, dataStore.isEditing, dataStore.activeSegmentIndex);
        }
    }
    
    _updateUI() {
        panelManager.updateUI({
            isEditing: dataStore.isEditing,
            isViewingDetail: dataStore.isViewingDetail,
            activeRoute: dataStore.activeRoute,
            activeSegmentIndex: dataStore.activeSegmentIndex
        });
        
        if (!dataStore.isEditing && !dataStore.isViewingDetail) {
            this._updateRoutesList();
        }
        
        this._updateCursor();
    }
    
    _updateRoutesList() {
        panelManager.updateRoutesList(dataStore.routes, dataStore.getFilteredRoutes());
    }
    
    _updateCursor() {
        const segment = dataStore.activeSegment;
        
        if (dataStore.isEditing && segment) {
            if (segment.waypoints.length === 0) {
                mapManager.setCursorMode('add-start-mode');
            } else if (dataStore.ctrlPressed) {
                mapManager.setCursorMode('add-routing-mode');
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
