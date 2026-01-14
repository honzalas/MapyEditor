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
        this._onSplit = null;
        this._onNoteEdit = null;
        this._onNoteDelete = null;
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
        
        document.getElementById('context-menu-split').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._data && this._onSplit) {
                this._onSplit(this._data);
            }
            this.hide();
        });
        
        // Note menu items (if they exist)
        const noteEditEl = document.getElementById('context-menu-note-edit');
        const noteDeleteEl = document.getElementById('context-menu-note-delete');
        
        if (noteEditEl) {
            noteEditEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._data && this._onNoteEdit) {
                    this._onNoteEdit(this._data);
                }
                this.hide();
            });
        }
        
        if (noteDeleteEl) {
            noteDeleteEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._data && this._onNoteDelete) {
                    this._onNoteDelete(this._data);
                }
                this.hide();
            });
        }
        
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
     * Set split callback (splits segment at waypoint)
     * @param {Function} callback - (data) => void
     */
    setSplitCallback(callback) {
        this._onSplit = callback;
    }
    
    /**
     * Set note edit callback
     * @param {Function} callback - (note) => void
     */
    setNoteEditCallback(callback) {
        this._onNoteEdit = callback;
    }
    
    /**
     * Set note delete callback
     * @param {Function} callback - (note) => void
     */
    setNoteDeleteCallback(callback) {
        this._onNoteDelete = callback;
    }
    
    /**
     * Show the context menu
     * @param {number} x - X position (pixels)
     * @param {number} y - Y position (pixels)
     * @param {Object} data - Context data 
     *   { type, routeId, segmentIndex, waypointIndex, segmentMode, waypointCount } or { type: 'note', note }
     */
    show(x, y, data) {
        this._data = data;
        this._element.style.left = x + 'px';
        this._element.style.top = y + 'px';
        this._element.style.display = 'block';
        
        // Show/hide mode change options based on current segment mode
        const routingOption = document.getElementById('context-menu-mode-routing');
        const manualOption = document.getElementById('context-menu-mode-manual');
        const splitOption = document.getElementById('context-menu-split');
        const deleteOption = document.getElementById('context-menu-delete');
        const noteEditOption = document.getElementById('context-menu-note-edit');
        const noteDeleteOption = document.getElementById('context-menu-note-delete');
        
        if (data.type === 'note') {
            // Note context menu - show only note options
            // Hide all waypoint-related options
            if (routingOption) routingOption.style.display = 'none';
            if (manualOption) manualOption.style.display = 'none';
            if (splitOption) splitOption.style.display = 'none';
            if (deleteOption) deleteOption.style.display = 'none';
            
            // Hide all separators
            const separators = this._element.querySelectorAll('.context-menu-separator');
            separators.forEach(sep => sep.style.display = 'none');
            
            // Show note options
            if (noteEditOption) noteEditOption.style.display = 'flex';
            if (noteDeleteOption) noteDeleteOption.style.display = 'flex';
        } else if (data.type === 'waypoint') {
            // Waypoint context menu - show waypoint options
            // Show all separators (they will be shown/hidden based on options)
            const separators = this._element.querySelectorAll('.context-menu-separator');
            separators.forEach(sep => sep.style.display = 'block');
            
            if (noteEditOption) noteEditOption.style.display = 'none';
            if (noteDeleteOption) noteDeleteOption.style.display = 'none';
            
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
            
            // Show split option only for waypoints that are not at the edges (not first, not last)
            // waypointIndex: 0 = first, waypointCount-1 = last
            const isNotAtEdge = data.waypointIndex > 0 && 
                                data.waypointIndex < (data.waypointCount - 1);
            splitOption.style.display = isNotAtEdge ? 'flex' : 'none';
            deleteOption.style.display = 'flex';
        } else {
            // Hide all options for unknown context
            if (routingOption) routingOption.style.display = 'none';
            if (manualOption) manualOption.style.display = 'none';
            if (splitOption) splitOption.style.display = 'none';
            if (deleteOption) deleteOption.style.display = 'none';
            if (noteEditOption) noteEditOption.style.display = 'none';
            if (noteDeleteOption) noteDeleteOption.style.display = 'none';
        }
        
        // Update mode change text to indicate it affects whole segment
        const routingText = routingOption ? (routingOption.querySelector('span') || routingOption.lastChild) : null;
        const manualText = manualOption ? (manualOption.querySelector('span') || manualOption.lastChild) : null;
        
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

   


