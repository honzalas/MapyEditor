/**
 * MapyEditor - Hover Marker
 * Dynamic marker for adding midpoints to segments
 * 
 * Updated for independent segments - only works on active segment
 */

import { CONFIG } from '../config.js';
import { mapManager } from './MapManager.js';
import { findClosestPointOnSegment } from '../services/GeometryUtils.js';

/**
 * Manages the hover marker for inserting midpoints
 */
class HoverMarker {
    constructor() {
        this._marker = null;
        this._data = null;
        this._onClick = null;
    }
    
    /**
     * Set click callback
     * @param {Function} callback - (data) => void
     */
    setClickCallback(callback) {
        this._onClick = callback;
    }
    
    /**
     * Show the hover marker at position
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {Object} data - Marker data (insertIndex, segmentIndex, etc.)
     */
    show(lat, lon, data) {
        if (!this._marker) {
            this._marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'hover-midpoint-marker',
                    html: `<div style="width: 24px; height: 24px; background: rgba(76, 175, 80, 0.95); border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: crosshair; pointer-events: auto;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                }),
                interactive: true,
                zIndexOffset: 2000
            });
            
            this._marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (this._data && this._onClick) {
                    this._onClick({ ...this._data });
                }
            });
            
            mapManager.addLayer(this._marker);
        } else {
            this._marker.setLatLng([lat, lon]);
            if (!mapManager.hasLayer(this._marker)) {
                mapManager.addLayer(this._marker);
            }
        }
        
        this._data = data;
    }
    
    /**
     * Hide the hover marker
     */
    hide() {
        if (this._marker && mapManager.hasLayer(this._marker)) {
            mapManager.removeLayer(this._marker);
        }
        this._data = null;
    }
    
    /**
     * Update hover marker position based on mouse location
     * Only shows on the active segment
     * @param {Object} latlng - Mouse position (Leaflet LatLng)
     * @param {Object} segment - Active segment object (or null)
     * @param {number} segmentIndex - Index of active segment
     * @param {boolean} isEditing - Whether we're editing
     */
    updatePosition(latlng, segment, segmentIndex, isEditing) {
        // Only show when editing and have an active segment
        if (!isEditing || !segment || !segment.geometry || segment.geometry.length < 2) {
            this.hide();
            return;
        }
        
        // Check if mouse is near any existing waypoint of the active segment
        const mousePoint = mapManager.latLngToContainerPoint(latlng);
        for (const wp of segment.waypoints) {
            const wpPixels = mapManager.latLngToContainerPoint([wp.lat, wp.lon]);
            const distanceToWp = Math.sqrt(
                Math.pow(mousePoint.x - wpPixels.x, 2) + 
                Math.pow(mousePoint.y - wpPixels.y, 2)
            );
            
            // If near existing waypoint, hide insert marker
            if (distanceToWp < CONFIG.UI.WAYPOINT_PROXIMITY_PX) {
                this.hide();
                return;
            }
        }
        
        // Find closest point on active segment geometry
        const result = findClosestPointOnSegment(latlng, segment);
        
        if (!result || !result.point) {
            this.hide();
            return;
        }
        
        // Calculate distance in pixels
        const pointPixels = mapManager.latLngToContainerPoint([result.point.lat, result.point.lon]);
        const pixelDistance = Math.sqrt(
            Math.pow(mousePoint.x - pointPixels.x, 2) + 
            Math.pow(mousePoint.y - pointPixels.y, 2)
        );
        
        // Show marker if close enough
        if (pixelDistance < CONFIG.UI.HOVER_MARKER_DISTANCE_PX) {
            this.show(result.point.lat, result.point.lon, {
                lat: result.point.lat,
                lon: result.point.lon,
                insertIndex: result.insertIndex,
                segmentIndex: segmentIndex
            });
        } else {
            this.hide();
        }
    }
    
    /**
     * Get current marker data
     * @returns {Object|null}
     */
    getData() {
        return this._data;
    }
}

// Singleton instance
export const hoverMarker = new HoverMarker();
