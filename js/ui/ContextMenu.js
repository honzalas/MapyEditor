/**
 * MapyEditor - Context Menu
 * Handles the context menu for waypoint operations
 * 
 * Updated for independent segments - mode change affects whole segment
 */

import { CONFIG } from '../config.js';

/**
 * Manages the context menu UI
 */
class ContextMenu {
    constructor() {
        this._element = null;
        this._data = null;
        this._onDelete = null;
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
     * Set mode change callback (changes whole segment mode)
     * @param {Function} callback - (data, newMode) => void
     */
    setModeChangeCallback(callback) {
        this._onModeChange = callback;
    }
    
    /**
     * Show the context menu
     * @param {number} x - X position (pixels)
     * @param {number} y - Y position (pixels)
     * @param {Object} data - Context data 
     *   { type, routeId, segmentIndex, waypointIndex, segmentMode, waypointCount }
     */
    show(x, y, data) {
        this._data = data;
        this._element.style.left = x + 'px';
        this._element.style.top = y + 'px';
        this._element.style.display = 'block';
        
        // Show/hide mode change options based on current segment mode
        const routingOption = document.getElementById('context-menu-mode-routing');
        const manualOption = document.getElementById('context-menu-mode-manual');
        
        if (data.type === 'waypoint') {
            // Mode change is for the whole segment - show opposite mode
            if (data.segmentMode === 'routing') {
                routingOption.style.display = 'none';
                manualOption.style.display = 'flex';
            } else {
                // Manual mode - can change to routing only if waypoint count <= 15
                if (data.waypointCount && data.waypointCount > CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
                    routingOption.style.display = 'none';
                } else {
                    routingOption.style.display = 'flex';
                }
                manualOption.style.display = 'none';
            }
        } else {
            // Hide mode options for non-waypoint context
            routingOption.style.display = 'none';
            manualOption.style.display = 'none';
        }
        
        // Update mode change text to indicate it affects whole segment
        const routingText = routingOption.querySelector('span') || routingOption.lastChild;
        const manualText = manualOption.querySelector('span') || manualOption.lastChild;
        
        // Text is already in the HTML, just ensure it's clear
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
