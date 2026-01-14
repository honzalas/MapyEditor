/**
 * MapyEditor - Notes Renderer
 * Handles rendering of notes on the map
 */

import { mapManager } from './MapManager.js';
import { dataStore } from '../models/DataStore.js';

/**
 * Renderer for notes markers
 */
class NotesRenderer {
    constructor() {
        this._onNoteContextMenu = null;
        this._onNoteDragEnd = null;
        this._noteMarkers = {}; // noteId -> marker
    }
    
    /**
     * Set callback for note context menu
     * @param {Function} callback - (pixel, note) => void
     */
    setNoteContextMenuCallback(callback) {
        this._onNoteContextMenu = callback;
    }
    
    /**
     * Set callback for note drag end
     * @param {Function} callback - (noteId, latlng) => void
     */
    setNoteDragEndCallback(callback) {
        this._onNoteDragEnd = callback;
    }
    
    /**
     * Render all notes on the map
     * @param {Array} notes - Array of note objects
     * @param {boolean} allowEdit - Whether notes can be edited/dragged (not in route editing mode)
     */
    renderAll(notes, allowEdit = true) {
        // Remove existing markers
        this.clear();
        
        notes.forEach(note => {
            this._renderNote(note, allowEdit);
        });
    }
    
    /**
     * Render a single note
     * @private
     */
    _renderNote(note, allowEdit) {
        // Use default Leaflet blue marker icon
        const marker = L.marker([note.lat, note.lon], {
            draggable: allowEdit && !dataStore.isEditing,
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        });
        
        // Change cursor to grab when dragging
        if (allowEdit && !dataStore.isEditing) {
            // Set cursor style on icon
            marker.on('add', () => {
                if (marker._icon) {
                    marker._icon.style.cursor = 'grab';
                    marker._icon.setAttribute('data-note-marker', 'true');
                }
            });
            marker.on('dragstart', () => {
                if (marker._icon) {
                    marker._icon.style.cursor = 'grabbing';
                }
            });
            marker.on('dragend', () => {
                if (marker._icon) {
                    marker._icon.style.cursor = 'grab';
                }
            });
            marker.on('mouseover', () => {
                if (marker._icon && !marker.dragging) {
                    marker._icon.style.cursor = 'grab';
                }
            });
            marker.on('mouseout', () => {
                if (marker._icon) {
                    marker._icon.style.cursor = 'grab';
                }
            });
        }
        
        // Add tooltip with note text (preserve line breaks)
        // Always bind tooltip, even if empty (so marker is visible)
        const tooltipText = note.text ? this._formatTooltipText(note.text) : 'Poznámka';
        marker.bindTooltip(tooltipText, {
            permanent: false,
            direction: 'top',
            className: 'note-tooltip',
            offset: [0, -30] // Move tooltip higher to avoid overlapping marker and context menu
        });
        
        // Add to map
        mapManager.addLayer(marker);
        
        // Drag handler (only if editing is allowed)
        if (allowEdit && !dataStore.isEditing) {
            marker.on('dragend', () => {
                if (this._onNoteDragEnd) {
                    const latlng = marker.getLatLng();
                    this._onNoteDragEnd(note.id, latlng);
                }
            });
        }
        
        // Context menu handler (only if editing is allowed)
        if (allowEdit && !dataStore.isEditing) {
            marker.on('contextmenu', (e) => {
                L.DomEvent.stopPropagation(e);
                if (this._onNoteContextMenu) {
                    const pixel = mapManager.latLngToContainerPoint(e.latlng);
                    this._onNoteContextMenu(pixel, note);
                }
            });
        }
        
        // Store marker reference (only if note has ID)
        if (note.id) {
            this._noteMarkers[note.id] = marker;
        }
    }
    
    /**
     * Format note text for tooltip (preserve line breaks)
     * @private
     */
    _formatTooltipText(text) {
        if (!text) return '';
        // Replace newlines with <br> for HTML display
        return text.replace(/\n/g, '<br>');
    }
    
    /**
     * Update a single note marker
     * @param {Note} note - Note object
     * @param {boolean} allowEdit - Whether notes can be edited/dragged
     */
    updateNote(note, allowEdit = true) {
        // Remove old marker
        if (this._noteMarkers[note.id]) {
            mapManager.removeLayer(this._noteMarkers[note.id]);
            delete this._noteMarkers[note.id];
        }
        
        // Render new marker
        this._renderNote(note, allowEdit);
    }
    
    /**
     * Remove a single note marker
     * @param {number} noteId - Note ID
     */
    removeNote(noteId) {
        if (this._noteMarkers[noteId]) {
            mapManager.removeLayer(this._noteMarkers[noteId]);
            delete this._noteMarkers[noteId];
        }
    }
    
    /**
     * Get marker for a note
     * @param {number} noteId - Note ID
     * @returns {Object|null} Leaflet marker or null
     */
    getMarker(noteId) {
        return this._noteMarkers[noteId] || null;
    }
    
    /**
     * Clear all note markers
     */
    clear() {
        Object.values(this._noteMarkers).forEach(marker => {
            mapManager.removeLayer(marker);
        });
        this._noteMarkers = {};
    }
}

// Singleton instance
export const notesRenderer = new NotesRenderer();
