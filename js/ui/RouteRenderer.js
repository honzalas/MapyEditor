/**
 * MapyEditor - Route Renderer
 * Handles rendering of routes on the map
 */

import { MARKER_COLORS, MARKER_SIZES, CONFIG } from '../config.js';
import { mapManager } from './MapManager.js';

/**
 * Renderer for routes and waypoint markers
 */
class RouteRenderer {
    constructor() {
        this._onRouteClick = null;
        this._onRouteHover = null;
        this._onMarkerDragEnd = null;
        this._onMarkerContextMenu = null;
    }
    
    /**
     * Set callback for route click
     * @param {Function} callback - (routeId) => void
     */
    setRouteClickCallback(callback) {
        this._onRouteClick = callback;
    }
    
    /**
     * Set callback for route hover
     * @param {Function} callback - (routeId, isHovering) => void
     */
    setRouteHoverCallback(callback) {
        this._onRouteHover = callback;
    }
    
    /**
     * Set callback for marker drag end
     * @param {Function} callback - (routeId, waypointIndex, latlng) => void
     */
    setMarkerDragEndCallback(callback) {
        this._onMarkerDragEnd = callback;
    }
    
    /**
     * Set callback for marker context menu
     * @param {Function} callback - (pixel, data) => void
     */
    setMarkerContextMenuCallback(callback) {
        this._onMarkerContextMenu = callback;
    }
    
    /**
     * Render a route on the map
     * @param {Object} route - Route object
     * @param {boolean} isActive - Whether the route is being edited
     * @param {boolean} isEditing - Whether we're in editing mode
     */
    render(route, isActive = false, isEditing = false) {
        // Remove existing layers
        mapManager.removeRouteLayers(route.id);
        
        if (route.waypoints.length === 0) {
            mapManager.setRouteLayers(route.id, { lines: [], markers: [] });
            return;
        }
        
        const color = route.getColor();
        const lines = [];
        const markers = [];
        
        // Render segments
        if (route.segments && route.segments.length > 0) {
            for (const segment of route.segments) {
                if (!segment.geometry || segment.geometry.length < 2) continue;
                
                const latLngs = segment.geometry.map(c => [c.lat, c.lon]);
                
                const lineOptions = {
                    color: color,
                    weight: CONFIG.ROUTE_LINE.WEIGHT_NORMAL,
                    opacity: CONFIG.ROUTE_LINE.OPACITY_NORMAL
                };
                
                // Dashed line for manual segments (only in edit mode)
                if (isActive && segment.mode === 'manual') {
                    lineOptions.dashArray = '10, 10';
                }
                
                const line = L.polyline(latLngs, lineOptions);
                mapManager.addLayer(line);
                
                if (!isActive) {
                    line.bindTooltip(route.getTitle(), {
                        permanent: false,
                        direction: 'top',
                        className: 'route-tooltip'
                    });
                    
                    line.on('mouseover', () => {
                        if (!isEditing && this._onRouteHover) {
                            this._onRouteHover(route.id, true);
                        }
                    });
                    
                    line.on('mouseout', () => {
                        if (!isEditing && this._onRouteHover) {
                            this._onRouteHover(route.id, false);
                        }
                    });
                    
                    line.on('click', (e) => {
                        if (!isEditing && this._onRouteClick) {
                            L.DomEvent.stopPropagation(e);
                            this._onRouteClick(route.id, e.latlng);
                        }
                    });
                }
                
                lines.push(line);
            }
        }
        
        // Render waypoint markers (only when active)
        if (isActive) {
            route.waypoints.forEach((wp, index) => {
                const isFirst = index === 0;
                const isLast = index === route.waypoints.length - 1;
                
                let markerColor, markerSize;
                if (isFirst) {
                    markerColor = MARKER_COLORS.START;
                    markerSize = MARKER_SIZES.ENDPOINT;
                } else if (isLast) {
                    markerColor = MARKER_COLORS.END;
                    markerSize = MARKER_SIZES.ENDPOINT;
                } else if (wp.mode === 'routing') {
                    markerColor = MARKER_COLORS.ROUTING;
                    markerSize = MARKER_SIZES.WAYPOINT;
                } else {
                    markerColor = MARKER_COLORS.MANUAL;
                    markerSize = MARKER_SIZES.WAYPOINT;
                }
                
                const marker = L.marker([wp.lat, wp.lon], {
                    draggable: true,
                    icon: L.divIcon({
                        className: 'vertex-marker',
                        html: `<div style="width: ${markerSize}px; height: ${markerSize}px; background: ${markerColor}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [markerSize, markerSize]
                    })
                });
                
                mapManager.addLayer(marker);
                
                marker.on('dragend', () => {
                    if (this._onMarkerDragEnd) {
                        const latlng = marker.getLatLng();
                        this._onMarkerDragEnd(route.id, index, latlng);
                    }
                });
                
                marker.on('contextmenu', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (this._onMarkerContextMenu) {
                        const pixel = mapManager.latLngToContainerPoint(e.latlng);
                        this._onMarkerContextMenu(pixel, { 
                            type: 'waypoint', 
                            index: index, 
                            mode: wp.mode 
                        });
                    }
                });
                
                markers.push(marker);
            });
        }
        
        mapManager.setRouteLayers(route.id, { lines, markers });
    }
    
    /**
     * Highlight or unhighlight a route
     * @param {number} routeId - Route ID
     * @param {boolean} highlight - Whether to highlight
     */
    highlightRoute(routeId, highlight) {
        const layers = mapManager.getRouteLayers(routeId);
        if (layers && layers.lines) {
            layers.lines.forEach(line => {
                if (highlight) {
                    line.setStyle({ 
                        weight: CONFIG.ROUTE_LINE.WEIGHT_HIGHLIGHT, 
                        opacity: CONFIG.ROUTE_LINE.OPACITY_HIGHLIGHT 
                    });
                } else {
                    line.setStyle({ 
                        weight: CONFIG.ROUTE_LINE.WEIGHT_NORMAL, 
                        opacity: CONFIG.ROUTE_LINE.OPACITY_NORMAL 
                    });
                }
            });
        }
    }
    
    /**
     * Render all routes
     * @param {Array} routes - Array of route objects
     * @param {number|null} activeRouteId - ID of active route
     * @param {boolean} isEditing - Whether we're in editing mode
     */
    renderAll(routes, activeRouteId, isEditing) {
        routes.forEach(route => {
            const isActive = route.id === activeRouteId && isEditing;
            this.render(route, isActive, isEditing);
        });
    }
}

// Singleton instance
export const routeRenderer = new RouteRenderer();


