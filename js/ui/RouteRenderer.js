/**
 * MapyEditor - Route Renderer
 * Handles rendering of routes on the map
 * 
 * Updated for independent segments - each segment rendered separately
 */

import { MARKER_COLORS, MARKER_SIZES, CONFIG } from '../config.js';
import { mapManager } from './MapManager.js';
import { dataStore } from '../models/DataStore.js';
import { hoverMarker } from './HoverMarker.js';

/**
 * Renderer for routes and waypoint markers
 */
class RouteRenderer {
    constructor() {
        this._onRouteClick = null;
        this._onRouteHover = null;
        this._onSegmentClick = null;
        this._onMarkerDragEnd = null;
        this._onMarkerContextMenu = null;
    }
    
    /**
     * Set callback for route click (when not editing)
     * @param {Function} callback - (routeId, latlng) => void
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
     * Set callback for segment click (when editing a route)
     * @param {Function} callback - (routeId, segmentIndex, latlng) => void
     */
    setSegmentClickCallback(callback) {
        this._onSegmentClick = callback;
    }
    
    /**
     * Set callback for marker drag end
     * @param {Function} callback - (routeId, segmentIndex, waypointIndex, latlng) => void
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
     * @param {boolean} isActive - Whether the route is active (being edited)
     * @param {boolean} isEditing - Whether we're in editing mode
     * @param {number|null} activeSegmentIndex - Index of active segment (if editing)
     */
    render(route, isActive = false, isEditing = false, activeSegmentIndex = null) {
        // Remove existing layers
        mapManager.removeRouteLayers(route.id);
        
        if (!route.segments || route.segments.length === 0) {
            mapManager.setRouteLayers(route.id, { lines: [], markers: [] });
            return;
        }
        
        const color = route.getColor();
        const routeTitle = route.getTitle();
        const allLines = [];
        const allMarkers = [];
        const allDecorators = [];
        
        // Determine opacity and weight based on mode
        let opacity, weight;
        if (isActive) {
            // Active route (detail or edit mode)
            if (isEditing) {
                opacity = CONFIG.ROUTE_LINE.OPACITY_EDIT;
                weight = CONFIG.ROUTE_LINE.WEIGHT_EDIT;
            } else {
                opacity = CONFIG.ROUTE_LINE.OPACITY_DETAIL;
                weight = CONFIG.ROUTE_LINE.WEIGHT_DETAIL;
            }
        } else {
            // Normal mode (inactive route)
            opacity = CONFIG.ROUTE_LINE.OPACITY_NORMAL;
            weight = CONFIG.ROUTE_LINE.WEIGHT_NORMAL;
        }
        
        // Render each segment
        route.segments.forEach((segment, segmentIndex) => {
            const isActiveSegment = isActive && isEditing && segmentIndex === activeSegmentIndex;
            const isInactiveSegmentOfActiveRoute = isActive && isEditing && segmentIndex !== activeSegmentIndex;
            
            // Render segment line
            if (segment.geometry && segment.geometry.length >= 2) {
                const latLngs = segment.geometry.map(c => [c.lat, c.lon]);
                
                const lineOptions = {
                    color: color,
                    weight: weight,
                    opacity: opacity
                };
                
                // Dashed line for manual segments (only in edit mode for active route)
                if (isActive && segment.mode === 'manual') {
                    lineOptions.dashArray = '10, 10';
                }
                
                const line = L.polyline(latLngs, lineOptions);
                mapManager.addLayer(line);
                
                // Create text decorator for route name (not in edit mode)
                // Uses route.getTitle() to ensure consistency across the app
                if (!isEditing && routeTitle) {
                    const decorator = L.polylineDecorator(line, {
                        patterns: [
                            {
                                offset: 0,
                                repeat: 300,
                                symbol: L.Symbol.marker({
                                    rotate: true,
                                    angleCorrection: -90,
                                    markerOptions: {
                                        icon: L.divIcon({
                                            className: 'text-marker',
                                            html: `<span style="color: ${color};">${routeTitle}</span>`,
                                            iconSize: [0, 0],
                                            iconAnchor: [0, 0]
                                        }),
                                        rotationOrigin: 'center center'
                                    }
                                })
                            }
                        ]
                    });
                    mapManager.addLayer(decorator);
                    allDecorators.push(decorator);
                }
                
                // Event handlers
                if (!isActive) {
                    // Not editing this route - show tooltip, allow selection
                    line.bindTooltip(route.getTitle(), {
                        permanent: false,
                        direction: 'top',
                        className: 'route-tooltip'
                    });
                    
                    line.on('mouseover', () => {
                        if (!dataStore.isEditing && this._onRouteHover) {
                            this._onRouteHover(route.id, true);
                        }
                    });
                    
                    line.on('mouseout', () => {
                        if (!dataStore.isEditing && this._onRouteHover) {
                            this._onRouteHover(route.id, false);
                        }
                    });
                    
                    line.on('click', (e) => {
                        if (!dataStore.isEditing && this._onRouteClick) {
                            L.DomEvent.stopPropagation(e);
                            this._onRouteClick(route.id, e.latlng);
                        }
                    });
                } else if (isInactiveSegmentOfActiveRoute) {
                    // Non-active segment of active route - click to switch (unless in add-point mode)
                    line.on('click', (e) => {
                        // Check if in "add point" mode - if so, let click pass to map
                        const activeSegment = dataStore.activeSegment;
                        const isAddPointMode = activeSegment && 
                            (activeSegment.waypoints.length === 0 || dataStore.ctrlPressed);
                        
                        if (isAddPointMode) {
                            // Don't intercept - let click propagate to map for adding point
                            return;
                        }
                        
                        L.DomEvent.stopPropagation(e);
                        // Hide hover marker to prevent accidental midpoint insertion
                        hoverMarker.hide();
                        if (this._onSegmentClick) {
                            this._onSegmentClick(route.id, segmentIndex, e.latlng);
                        }
                    });
                    
                    // Show segment number on hover
                    line.bindTooltip(`Segment ${segmentIndex + 1}`, {
                        permanent: false,
                        direction: 'top',
                        className: 'route-tooltip'
                    });
                }
                
                allLines.push(line);
            }
            
            // Render waypoint markers
            if (isActiveSegment) {
                // Active segment - full colored markers, draggable
                const markers = this._renderActiveSegmentMarkers(route, segment, segmentIndex);
                allMarkers.push(...markers);
            } else if (isInactiveSegmentOfActiveRoute && segment.waypoints.length > 0) {
                // Non-active segment of active route - small gray markers on start/end
                const markers = this._renderInactiveSegmentMarkers(route, segment, segmentIndex);
                allMarkers.push(...markers);
            }
        });
        
        // Bring active segment to front (if any)
        if (isActive && isEditing && activeSegmentIndex !== null) {
            // Re-add active segment layers to bring them to top
            const activeSegment = route.segments[activeSegmentIndex];
            if (activeSegment && activeSegment.geometry && activeSegment.geometry.length >= 2) {
                // The markers are already on top since they were added last
                // For lines, we can use bringToFront
                allLines.forEach((line, idx) => {
                    if (idx === activeSegmentIndex) {
                        line.bringToFront();
                    }
                });
            }
        }
        
        mapManager.setRouteLayers(route.id, { lines: allLines, markers: allMarkers, decorators: allDecorators });
    }
    
    /**
     * Render markers for the active segment
     * @private
     */
    _renderActiveSegmentMarkers(route, segment, segmentIndex) {
        const markers = [];
        
        segment.waypoints.forEach((wp, index) => {
            const isFirst = index === 0;
            const isLast = index === segment.waypoints.length - 1;
            
            let markerColor, markerSize;
            if (isFirst) {
                markerColor = MARKER_COLORS.START;
                markerSize = MARKER_SIZES.ENDPOINT;
            } else if (isLast) {
                markerColor = MARKER_COLORS.END;
                markerSize = MARKER_SIZES.ENDPOINT;
            } else {
                // Via waypoints - use routing color (yellow) for routing, manual (light blue) for manual
                markerColor = segment.mode === 'routing' ? MARKER_COLORS.ROUTING : MARKER_COLORS.MANUAL;
                markerSize = MARKER_SIZES.WAYPOINT;
            }
            
            // Ordinal number (1-based): start is 1, first waypoint is 2, etc.
            const ordinalNumber = index + 1;
            
            // Create HTML with marker circle and label below
            const markerHtml = `
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="width: ${markerSize}px; height: ${markerSize}px; background: ${markerColor}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                    <div class="waypoint-label" style="margin-top: 2px; font-size: 11px; font-weight: 600; color: #000000; text-shadow: -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, -1px 0 0 #ffffff, 1px 0 0 #ffffff, 0 -1px 0 #ffffff, 0 1px 0 #ffffff; line-height: 1; white-space: nowrap;">${ordinalNumber}</div>
                </div>
            `;
            
            // Calculate icon size to accommodate marker + label
            const iconHeight = markerSize + 18; // marker + spacing + label height
            const iconWidth = Math.max(markerSize, 20); // at least 20px for label
            
            const marker = L.marker([wp.lat, wp.lon], {
                draggable: true,
                icon: L.divIcon({
                    className: 'vertex-marker',
                    html: markerHtml,
                    iconSize: [iconWidth, iconHeight],
                    iconAnchor: [iconWidth / 2, markerSize / 2] // Anchor at center of marker circle
                })
            });
            
            mapManager.addLayer(marker);
            
            marker.on('dragend', () => {
                if (this._onMarkerDragEnd) {
                    const latlng = marker.getLatLng();
                    this._onMarkerDragEnd(route.id, segmentIndex, index, latlng);
                }
            });
            
            marker.on('contextmenu', (e) => {
                L.DomEvent.stopPropagation(e);
                if (this._onMarkerContextMenu) {
                    const pixel = mapManager.latLngToContainerPoint(e.latlng);
                    this._onMarkerContextMenu(pixel, { 
                        type: 'waypoint', 
                        routeId: route.id,
                        segmentIndex: segmentIndex,
                        waypointIndex: index,
                        segmentMode: segment.mode
                    });
                }
            });
            
            markers.push(marker);
        });
        
        return markers;
    }
    
    /**
     * Render small gray markers for non-active segments (start/end only)
     * @private
     */
    _renderInactiveSegmentMarkers(route, segment, segmentIndex) {
        const markers = [];
        const markerSize = 10;
        const markerColor = '#888888';  // Gray
        
        // Start marker
        if (segment.waypoints.length > 0) {
            const startWp = segment.waypoints[0];
            const startMarker = L.marker([startWp.lat, startWp.lon], {
                draggable: false,
                interactive: true,
                icon: L.divIcon({
                    className: 'vertex-marker inactive-segment-marker',
                    html: `<div style="width: ${markerSize}px; height: ${markerSize}px; background: ${markerColor}; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>`,
                    iconSize: [markerSize, markerSize]
                })
            });
            
            // Click to activate this segment (unless in add-point mode)
            startMarker.on('click', (e) => {
                const activeSegment = dataStore.activeSegment;
                const isAddPointMode = activeSegment && 
                    (activeSegment.waypoints.length === 0 || dataStore.ctrlPressed);
                
                if (isAddPointMode) {
                    return; // Let click propagate to map
                }
                
                L.DomEvent.stopPropagation(e);
                hoverMarker.hide();
                if (this._onSegmentClick) {
                    this._onSegmentClick(route.id, segmentIndex, e.latlng);
                }
            });
            
            mapManager.addLayer(startMarker);
            markers.push(startMarker);
        }
        
        // End marker (if different from start)
        if (segment.waypoints.length > 1) {
            const endWp = segment.waypoints[segment.waypoints.length - 1];
            const endMarker = L.marker([endWp.lat, endWp.lon], {
                draggable: false,
                interactive: true,
                icon: L.divIcon({
                    className: 'vertex-marker inactive-segment-marker',
                    html: `<div style="width: ${markerSize}px; height: ${markerSize}px; background: ${markerColor}; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>`,
                    iconSize: [markerSize, markerSize]
                })
            });
            
            // Click to activate this segment (unless in add-point mode)
            endMarker.on('click', (e) => {
                const activeSegment = dataStore.activeSegment;
                const isAddPointMode = activeSegment && 
                    (activeSegment.waypoints.length === 0 || dataStore.ctrlPressed);
                
                if (isAddPointMode) {
                    return; // Let click propagate to map
                }
                
                L.DomEvent.stopPropagation(e);
                hoverMarker.hide();
                if (this._onSegmentClick) {
                    this._onSegmentClick(route.id, segmentIndex, e.latlng);
                }
            });
            
            mapManager.addLayer(endMarker);
            markers.push(endMarker);
        }
        
        return markers;
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
                const route = dataStore.getRoute(routeId);
                const isActive = route && route.id === dataStore.activeRouteId;
                const isEditing = dataStore.isEditing && isActive;
                
                if (highlight) {
                    // Use full opacity when highlighting
                    line.setStyle({ 
                        weight: CONFIG.ROUTE_LINE.WEIGHT_HIGHLIGHT, 
                        opacity: CONFIG.ROUTE_LINE.OPACITY_HIGHLIGHT 
                    });
                } else {
                    // Restore appropriate opacity based on route state
                    let opacity, weight;
                    if (isActive) {
                        if (isEditing) {
                            opacity = CONFIG.ROUTE_LINE.OPACITY_EDIT;
                            weight = CONFIG.ROUTE_LINE.WEIGHT_EDIT;
                        } else {
                            opacity = CONFIG.ROUTE_LINE.OPACITY_DETAIL;
                            weight = CONFIG.ROUTE_LINE.WEIGHT_DETAIL;
                        }
                    } else {
                        opacity = CONFIG.ROUTE_LINE.OPACITY_NORMAL;
                        weight = CONFIG.ROUTE_LINE.WEIGHT_NORMAL;
                    }
                    line.setStyle({ 
                        weight: weight, 
                        opacity: opacity 
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
     * @param {number|null} activeSegmentIndex - Index of active segment
     */
    renderAll(routes, activeRouteId, isEditing, activeSegmentIndex = null) {
        routes.forEach(route => {
            const isActive = route.id === activeRouteId;
            this.render(route, isActive, isEditing, isActive ? activeSegmentIndex : null);
        });
    }
}

// Singleton instance
export const routeRenderer = new RouteRenderer();
