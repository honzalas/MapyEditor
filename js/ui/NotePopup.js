/**
 * MapyEditor - Note Popup
 * Handles the popup window for editing notes
 */

/**
 * Manages the note popup UI
 */
class NotePopup {
    constructor() {
        this._element = null;
        this._textarea = null;
        this._closeButton = null;
        this._currentNote = null;
        this._onSave = null;
        this._marker = null; // Leaflet marker for positioning
    }
    
    /**
     * Initialize the note popup
     */
    initialize() {
        this._element = document.getElementById('note-popup');
        this._textarea = document.getElementById('note-popup-text');
        this._closeButton = document.getElementById('note-popup-close');
        
        if (!this._element || !this._textarea || !this._closeButton) {
            console.error('NotePopup: Required elements not found');
            return;
        }
        
        // Close button handler
        this._closeButton.addEventListener('click', () => {
            this._saveAndClose();
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this._saveAndClose();
            }
        });
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.isVisible() && !this._element.contains(e.target)) {
                this._saveAndClose();
            }
        });
        
        // Prevent closing when clicking inside popup
        this._element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Set save callback
     * @param {Function} callback - (note, text) => void
     */
    setSaveCallback(callback) {
        this._onSave = callback;
    }
    
    /**
     * Show popup for editing a note
     * @param {Object} note - Note object
     * @param {Object} marker - Leaflet marker (for positioning)
     */
    show(note, marker) {
        if (!note) return;
        
        this._currentNote = note;
        this._marker = marker;
        
        // Set text content (preserve line breaks)
        this._textarea.value = note.text || '';
        
        // Position popup near marker
        if (marker) {
            const pixel = marker._map.latLngToContainerPoint(marker.getLatLng());
            this._element.style.left = (pixel.x + 20) + 'px';
            this._element.style.top = (pixel.y - 10) + 'px';
        } else {
            // Center on screen if no marker
            this._element.style.left = '50%';
            this._element.style.top = '50%';
            this._element.style.transform = 'translate(-50%, -50%)';
        }
        
        this._element.style.display = 'block';
        
        // Focus textarea
        setTimeout(() => {
            this._textarea.focus();
            // Move cursor to end
            this._textarea.setSelectionRange(this._textarea.value.length, this._textarea.value.length);
        }, 10);
        
        // Adjust position if it goes off screen
        setTimeout(() => {
            const rect = this._element.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                if (marker) {
                    const pixel = marker._map.latLngToContainerPoint(marker.getLatLng());
                    this._element.style.left = (pixel.x - rect.width - 20) + 'px';
                } else {
                    this._element.style.left = (window.innerWidth - rect.width - 20) + 'px';
                }
            }
            if (rect.bottom > window.innerHeight) {
                if (marker) {
                    const pixel = marker._map.latLngToContainerPoint(marker.getLatLng());
                    this._element.style.top = (pixel.y - rect.height - 10) + 'px';
                } else {
                    this._element.style.top = (window.innerHeight - rect.height - 20) + 'px';
                }
            }
        }, 0);
    }
    
    /**
     * Show popup for creating a new note
     * @param {Object} latlng - Leaflet LatLng object (has lat and lng properties)
     * @param {Object} map - Leaflet map instance (optional, for positioning)
     */
    showNew(latlng, map = null) {
        // Leaflet uses 'lng', but our Note model uses 'lon'
        const note = { id: null, lat: latlng.lat, lon: latlng.lng || latlng.lon, text: '' };
        this._currentNote = note;
        this._marker = null;
        
        // Set text content
        this._textarea.value = '';
        
        // Position popup at click point
        if (map) {
            const pixel = map.latLngToContainerPoint(latlng);
            this._element.style.left = (pixel.x + 20) + 'px';
            this._element.style.top = (pixel.y - 10) + 'px';
            this._element.style.transform = 'none';
        } else {
            // Center on screen if no map
            this._element.style.left = '50%';
            this._element.style.top = '50%';
            this._element.style.transform = 'translate(-50%, -50%)';
        }
        
        this._element.style.display = 'block';
        
        // Focus textarea
        setTimeout(() => {
            this._textarea.focus();
        }, 10);
        
        // Adjust position if it goes off screen
        if (map) {
            setTimeout(() => {
                const rect = this._element.getBoundingClientRect();
                const pixel = map.latLngToContainerPoint(latlng);
                if (rect.right > window.innerWidth) {
                    this._element.style.left = (pixel.x - rect.width - 20) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    this._element.style.top = (pixel.y - rect.height - 10) + 'px';
                }
            }, 0);
        }
    }
    
    /**
     * Hide the popup
     */
    hide() {
        if (this._element) {
            this._element.style.display = 'none';
        }
        this._currentNote = null;
        this._marker = null;
    }
    
    /**
     * Check if popup is visible
     * @returns {boolean}
     */
    isVisible() {
        return this._element && this._element.style.display === 'block';
    }
    
    /**
     * Save and close popup
     * @private
     */
    _saveAndClose() {
        if (this._currentNote && this._onSave) {
            const text = this._textarea.value || '';
            this._onSave(this._currentNote, text);
        }
        this.hide();
    }
}

// Singleton instance
export const notePopup = new NotePopup();
