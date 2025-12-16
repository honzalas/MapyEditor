/**
 * MapyEditor - Context Menu
 * Handles the context menu for waypoint operations
 */

/**
 * Manages the context menu UI
 */
class ContextMenu {
    constructor() {
        this._element = null;
        this._data = null;
        this._onDelete = null;
        this._onSplit = null;
        this._onModeChange = null;
    }
    
    /**
     * Initialize the context menu
     */
    initialize() {
        this._element = document.getElementById('context-menu');
        
        // Bind event handlers
        document.getElementById('context-menu-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._data && this._onDelete) {
                this._onDelete(this._data);
            }
            this.hide();
        });
        
        document.getElementById('context-menu-split').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._data && this._onSplit) {
                this._onSplit(this._data);
            }
            this.hide();
        });
        
        document.getElementById('context-menu-mode-routing').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._data && this._onModeChange) {
                this._onModeChange(this._data, 'routing');
            }
            this.hide();
        });
        
        document.getElementById('context-menu-mode-manual').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._data && this._onModeChange) {
                this._onModeChange(this._data, 'manual');
            }
            this.hide();
        });
        
        // Hide on any click outside
        document.addEventListener('click', () => {
            this.hide();
        });
    }
    
    /**
     * Set delete callback
     * @param {Function} callback - (data) => void
     */
    setDeleteCallback(callback) {
        this._onDelete = callback;
    }
    
    /**
     * Set split callback
     * @param {Function} callback - (data) => void
     */
    setSplitCallback(callback) {
        this._onSplit = callback;
    }
    
    /**
     * Set mode change callback
     * @param {Function} callback - (data, newMode) => void
     */
    setModeChangeCallback(callback) {
        this._onModeChange = callback;
    }
    
    /**
     * Show the context menu
     * @param {number} x - X position (pixels)
     * @param {number} y - Y position (pixels)
     * @param {Object} data - Context data (type, index, mode)
     */
    show(x, y, data) {
        this._data = data;
        this._element.style.left = x + 'px';
        this._element.style.top = y + 'px';
        this._element.style.display = 'block';
        
        // Show/hide mode change options based on current mode
        const routingOption = document.getElementById('context-menu-mode-routing');
        const manualOption = document.getElementById('context-menu-mode-manual');
        
        if (data.type === 'waypoint' && data.index > 0) {
            // Not start point, can change mode
            routingOption.style.display = data.mode === 'routing' ? 'none' : 'flex';
            manualOption.style.display = data.mode === 'manual' ? 'none' : 'flex';
        } else {
            // Start point - hide mode options
            routingOption.style.display = 'none';
            manualOption.style.display = 'none';
        }
    }
    
    /**
     * Hide the context menu
     */
    hide() {
        if (this._element) {
            this._element.style.display = 'none';
        }
        this._data = null;
    }
    
    /**
     * Get current context data
     * @returns {Object|null}
     */
    getData() {
        return this._data;
    }
}

// Singleton instance
export const contextMenu = new ContextMenu();






