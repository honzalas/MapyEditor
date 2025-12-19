/**
 * MapyEditor - Panel Manager
 * Manages the right panel UI (routes list, attributes, segments, import/export)
 * 
 * Updated for independent segments - includes segment list management
 */

import { ROUTE_TYPE_ENUM, ROUTE_COLOR_ENUM, ROUTE_NETWORK_ENUM, CONFIG } from '../config.js';

/**
 * Manages the right panel UI
 */
class PanelManager {
    constructor() {
        // Element references
        this._statusBar = null;
        this._loadingIndicator = null;
        this._attributesPanel = null;
        this._routesListContainer = null;
        this._routesList = null;
        this._routesCount = null;
        this._importPanel = null;
        this._dropzone = null;
        this._routeMenu = null;
        this._editScrollableContent = null;
        
        // Form elements
        this._routeTypeSelect = null;
        this._routeRefInput = null;
        this._routeNameInput = null;
        this._routeColorSelect = null;
        this._routeCustomColorInput = null;
        this._customColorGroup = null;
        this._routeSymbolInput = null;
        this._routeNetworkSelect = null;
        this._routeWikidataInput = null;
        this._routeCustomDataTextarea = null;
        this._customDataToggle = null;
        this._customDataContent = null;
        
        // Segment elements
        this._segmentsList = null;
        this._addSegmentBtn = null;
        this._segmentMenu = null;
        
        // Callbacks
        this._onRouteClick = null;
        this._onRouteHover = null;
        this._onAttributeChange = null;
        this._onSave = null;
        this._onCancel = null;
        this._onCreateRoute = null;
        this._onImport = null;
        this._onExport = null;
        this._onDeleteRoute = null;
        this._onCopyRoute = null;
        this._onSearchChange = null;
        
        // Segment callbacks
        this._onSegmentClick = null;
        this._onAddSegment = null;
        this._onDeleteSegment = null;
        this._onChangeSegmentMode = null;
    }
    
    /**
     * Initialize the panel manager
     */
    initialize() {
        this._statusBar = document.getElementById('status-bar');
        this._loadingIndicator = document.getElementById('loading-indicator');
        this._attributesPanel = document.getElementById('attributes-panel');
        this._routesListContainer = document.getElementById('routes-list-container');
        this._routesList = document.getElementById('routes-list');
        this._routesCount = document.getElementById('routes-count');
        this._importPanel = document.getElementById('import-panel');
        this._dropzone = document.getElementById('dropzone');
        this._routeMenu = document.getElementById('route-menu');
        this._editScrollableContent = document.getElementById('edit-scrollable-content');
        
        // Form elements
        this._routeTypeSelect = document.getElementById('route-type');
        this._routeRefInput = document.getElementById('route-ref');
        this._routeNameInput = document.getElementById('route-name');
        this._routeColorSelect = document.getElementById('route-color');
        this._routeCustomColorInput = document.getElementById('route-custom-color');
        this._customColorGroup = document.getElementById('custom-color-group');
        this._routeSymbolInput = document.getElementById('route-symbol');
        this._routeNetworkSelect = document.getElementById('route-network');
        this._routeWikidataInput = document.getElementById('route-wikidata');
        this._routeCustomDataTextarea = document.getElementById('route-custom-data');
        this._customDataToggle = document.getElementById('custom-data-toggle');
        this._customDataContent = document.getElementById('custom-data-content');
        
        // Segment elements
        this._segmentsList = document.getElementById('segments-list');
        this._addSegmentBtn = document.getElementById('btn-add-segment');
        this._segmentMenu = document.getElementById('segment-menu');
        
        this._populateSelects();
        this._bindEvents();
    }
    
    /**
     * Populate select boxes from enums
     * @private
     */
    _populateSelects() {
        // Route type
        this._routeTypeSelect.innerHTML = '';
        ROUTE_TYPE_ENUM.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            this._routeTypeSelect.appendChild(option);
        });
        
        // Color (with empty option)
        this._routeColorSelect.innerHTML = '<option value="">-- Bez barvy --</option>';
        ROUTE_COLOR_ENUM.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            this._routeColorSelect.appendChild(option);
        });
        
        // Network
        this._routeNetworkSelect.innerHTML = '';
        ROUTE_NETWORK_ENUM.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            this._routeNetworkSelect.appendChild(option);
        });
    }
    
    /**
     * Bind event handlers
     * @private
     */
    _bindEvents() {
        // Attribute change handlers
        const notifyChange = (attr, value) => {
            if (this._onAttributeChange) {
                this._onAttributeChange(attr, value);
            }
        };
        
        this._routeTypeSelect.addEventListener('change', () => {
            notifyChange('routeType', this._routeTypeSelect.value);
        });
        
        this._routeRefInput.addEventListener('input', () => {
            notifyChange('ref', this._routeRefInput.value || null);
        });
        
        this._routeNameInput.addEventListener('input', () => {
            notifyChange('name', this._routeNameInput.value || null);
        });
        
        this._routeColorSelect.addEventListener('change', () => {
            const color = this._routeColorSelect.value || null;
            notifyChange('color', color);
            // Show/hide custom color input
            this._customColorGroup.style.display = color === 'Other' ? 'block' : 'none';
        });
        
        this._routeCustomColorInput.addEventListener('input', () => {
            notifyChange('customColor', this._routeCustomColorInput.value);
        });
        
        this._routeSymbolInput.addEventListener('input', () => {
            notifyChange('symbol', this._routeSymbolInput.value || null);
        });
        
        this._routeNetworkSelect.addEventListener('change', () => {
            notifyChange('network', this._routeNetworkSelect.value);
        });
        
        this._routeWikidataInput.addEventListener('input', () => {
            notifyChange('wikidata', this._routeWikidataInput.value || null);
        });
        
        this._routeCustomDataTextarea.addEventListener('input', () => {
            notifyChange('customData', this._routeCustomDataTextarea.value || null);
        });
        
        // Custom data toggle
        this._customDataToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = this._customDataContent.style.display !== 'none';
            this._customDataContent.style.display = isVisible ? 'none' : 'block';
            this._customDataToggle.querySelector('.toggle-icon').textContent = isVisible ? '▶' : '▼';
        });
        
        // Save button
        document.getElementById('btn-save-route').addEventListener('click', () => {
            if (this._onSave) {
                this._onSave();
            }
        });
        
        // Cancel button
        document.getElementById('btn-cancel-route').addEventListener('click', () => {
            if (this._onCancel) {
                this._onCancel();
            }
        });
        
        // Create route button
        document.getElementById('btn-create-route').addEventListener('click', () => {
            if (this._onCreateRoute) {
                this._onCreateRoute();
            }
        });
        
        // Import button
        document.getElementById('btn-import-gpx').addEventListener('click', () => {
            this.showImportPanel();
        });
        
        // Export button
        document.getElementById('btn-export-gpx').addEventListener('click', () => {
            if (this._onExport) {
                this._onExport();
            }
        });
        
        // Close import button
        document.getElementById('btn-close-import').addEventListener('click', () => {
            this.hideImportPanel();
        });
        
        // Dropzone click
        this._dropzone.addEventListener('click', () => {
            document.getElementById('gpx-input').click();
        });
        
        // File input change
        document.getElementById('gpx-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0 && this._onImport) {
                this._onImport(e.target.files);
                e.target.value = '';
            }
        });
        
        // Drag and drop
        this._dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._dropzone.classList.add('dragover');
        });
        
        this._dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._dropzone.classList.remove('dragover');
        });
        
        this._dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0 && this._onImport) {
                this._onImport(e.dataTransfer.files);
            }
        });
        
        // Route menu button
        const routeMenuBtn = document.getElementById('route-menu-btn');
        routeMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._routeMenu.classList.toggle('visible');
        });
        
        // Copy route menu item
        document.getElementById('menu-copy-route').addEventListener('click', (e) => {
            e.stopPropagation();
            this._routeMenu.classList.remove('visible');
            if (this._onCopyRoute) {
                this._onCopyRoute();
            }
        });
        
        // Delete route menu item
        document.getElementById('menu-delete-route').addEventListener('click', (e) => {
            e.stopPropagation();
            this._routeMenu.classList.remove('visible');
            if (this._onDeleteRoute) {
                this._onDeleteRoute();
            }
        });
        
        // Close route menu on click elsewhere
        document.addEventListener('click', () => {
            this._routeMenu.classList.remove('visible');
            if (this._segmentMenu) {
                this._segmentMenu.classList.remove('visible');
            }
        });
        
        // Search input
        document.getElementById('route-search-input').addEventListener('input', (e) => {
            if (this._onSearchChange) {
                this._onSearchChange(e.target.value);
            }
        });
        
        // Add segment button
        if (this._addSegmentBtn) {
            this._addSegmentBtn.addEventListener('click', () => {
                if (this._onAddSegment) {
                    this._onAddSegment();
                }
            });
        }
        
        // Segment menu items
        const menuDeleteSegment = document.getElementById('menu-delete-segment');
        const menuSegmentToRouting = document.getElementById('menu-segment-to-routing');
        const menuSegmentToManual = document.getElementById('menu-segment-to-manual');
        
        if (menuDeleteSegment) {
            menuDeleteSegment.addEventListener('click', (e) => {
                e.stopPropagation();
                this._segmentMenu.classList.remove('visible');
                const segmentIndex = parseInt(this._segmentMenu.dataset.segmentIndex);
                if (this._onDeleteSegment && !isNaN(segmentIndex)) {
                    this._onDeleteSegment(segmentIndex);
                }
            });
        }
        
        if (menuSegmentToRouting) {
            menuSegmentToRouting.addEventListener('click', (e) => {
                e.stopPropagation();
                this._segmentMenu.classList.remove('visible');
                const segmentIndex = parseInt(this._segmentMenu.dataset.segmentIndex);
                if (this._onChangeSegmentMode && !isNaN(segmentIndex)) {
                    this._onChangeSegmentMode(segmentIndex, 'routing');
                }
            });
        }
        
        if (menuSegmentToManual) {
            menuSegmentToManual.addEventListener('click', (e) => {
                e.stopPropagation();
                this._segmentMenu.classList.remove('visible');
                const segmentIndex = parseInt(this._segmentMenu.dataset.segmentIndex);
                if (this._onChangeSegmentMode && !isNaN(segmentIndex)) {
                    this._onChangeSegmentMode(segmentIndex, 'manual');
                }
            });
        }
    }
    
    // ==================
    // CALLBACKS SETTERS
    // ==================
    
    setRouteClickCallback(callback) { this._onRouteClick = callback; }
    setRouteHoverCallback(callback) { this._onRouteHover = callback; }
    setAttributeChangeCallback(callback) { this._onAttributeChange = callback; }
    setSaveCallback(callback) { this._onSave = callback; }
    setCancelCallback(callback) { this._onCancel = callback; }
    setCreateRouteCallback(callback) { this._onCreateRoute = callback; }
    setImportCallback(callback) { this._onImport = callback; }
    setExportCallback(callback) { this._onExport = callback; }
    setDeleteRouteCallback(callback) { this._onDeleteRoute = callback; }
    setCopyRouteCallback(callback) { this._onCopyRoute = callback; }
    setSearchChangeCallback(callback) { this._onSearchChange = callback; }
    
    // Segment callbacks
    setSegmentClickCallback(callback) { this._onSegmentClick = callback; }
    setAddSegmentCallback(callback) { this._onAddSegment = callback; }
    setDeleteSegmentCallback(callback) { this._onDeleteSegment = callback; }
    setChangeSegmentModeCallback(callback) { this._onChangeSegmentMode = callback; }
    
    // ==================
    // UI UPDATES
    // ==================
    
    /**
     * Update the status bar text
     * @param {string} text - Status text
     */
    setStatusText(text) {
        this._statusBar.textContent = text;
    }
    
    /**
     * Show loading indicator
     */
    showLoading() {
        this._loadingIndicator.style.display = 'block';
    }
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        this._loadingIndicator.style.display = 'none';
    }
    
    /**
     * Update the UI based on editing state
     * @param {Object} state - UI state
     * @param {boolean} state.isEditing - Whether we're editing
     * @param {Object|null} state.activeRoute - Active route object
     * @param {number|null} state.activeSegmentIndex - Index of active segment
     */
    updateUI(state) {
        const { isEditing, activeRoute, activeSegmentIndex } = state;
        
        // Disable/enable buttons based on mode
        document.getElementById('btn-create-route').disabled = isEditing;
        document.getElementById('btn-export-gpx').disabled = isEditing;
        document.getElementById('btn-import-gpx').disabled = isEditing;
        
        if (isEditing && activeRoute) {
            // Update status bar
            const title = activeRoute.getTitle();
            const activeSegment = activeRoute.getSegment(activeSegmentIndex);
            const segmentWpCount = activeSegment ? activeSegment.waypoints.length : 0;
            
            if (segmentWpCount === 0) {
                this.setStatusText(`${title} - Segment ${(activeSegmentIndex || 0) + 1}: klikněte pro start`);
            } else {
                this.setStatusText(`${title} - Segment ${(activeSegmentIndex || 0) + 1} (${segmentWpCount} bodů)`);
            }
            
            // Hide routes list, show attributes panel
            this._routesListContainer.classList.add('hidden');
            this._attributesPanel.style.display = 'flex';
            
            // Fill form with route attributes (only if value differs to preserve focus)
            if (this._routeTypeSelect.value !== (activeRoute.routeType || 'Hiking')) {
                this._routeTypeSelect.value = activeRoute.routeType || 'Hiking';
            }
            if (this._routeRefInput.value !== (activeRoute.ref || '')) {
                this._routeRefInput.value = activeRoute.ref || '';
            }
            if (this._routeNameInput.value !== (activeRoute.name || '')) {
                this._routeNameInput.value = activeRoute.name || '';
            }
            if (this._routeColorSelect.value !== (activeRoute.color || '')) {
                this._routeColorSelect.value = activeRoute.color || '';
            }
            if (this._routeCustomColorInput.value !== (activeRoute.customColor || '#808080')) {
                this._routeCustomColorInput.value = activeRoute.customColor || '#808080';
            }
            this._customColorGroup.style.display = activeRoute.color === 'Other' ? 'block' : 'none';
            if (this._routeSymbolInput.value !== (activeRoute.symbol || '')) {
                this._routeSymbolInput.value = activeRoute.symbol || '';
            }
            if (this._routeNetworkSelect.value !== (activeRoute.network || 'Nwn')) {
                this._routeNetworkSelect.value = activeRoute.network || 'Nwn';
            }
            if (this._routeWikidataInput.value !== (activeRoute.wikidata || '')) {
                this._routeWikidataInput.value = activeRoute.wikidata || '';
            }
            if (this._routeCustomDataTextarea.value !== (activeRoute.customData || '')) {
                this._routeCustomDataTextarea.value = activeRoute.customData || '';
            }
            
            // Update segments list
            this._updateSegmentsList(activeRoute, activeSegmentIndex);
            
            // Enable save and cancel buttons
            document.getElementById('btn-save-route').disabled = false;
            document.getElementById('btn-cancel-route').disabled = false;
        } else {
            this.setStatusText('Nevybraná trasa');
            
            // Show routes list, hide attributes panel
            this._routesListContainer.classList.remove('hidden');
            this._attributesPanel.style.display = 'none';
            document.getElementById('btn-save-route').disabled = true;
            document.getElementById('btn-cancel-route').disabled = true;
        }
    }
    
    /**
     * Update the segments list
     * @private
     */
    _updateSegmentsList(route, activeSegmentIndex) {
        if (!this._segmentsList) return;
        
        this._segmentsList.innerHTML = '';
        
        route.segments.forEach((segment, index) => {
            const segmentItem = document.createElement('div');
            segmentItem.className = 'segment-item';
            if (index === activeSegmentIndex) {
                segmentItem.classList.add('active');
            }
            segmentItem.dataset.segmentIndex = index;
            
            const segmentInfo = document.createElement('div');
            segmentInfo.className = 'segment-info';
            
            const segmentNumber = document.createElement('span');
            segmentNumber.className = 'segment-number';
            segmentNumber.textContent = `${index + 1}.`;
            
            const segmentType = document.createElement('span');
            segmentType.className = 'segment-type';
            segmentType.textContent = segment.mode === 'routing' ? 'Plánovaný' : 'Ruční';
            
            const segmentWpCount = document.createElement('span');
            segmentWpCount.className = 'segment-wp-count';
            segmentWpCount.textContent = `(${segment.waypoints.length} bodů)`;
            
            segmentInfo.appendChild(segmentNumber);
            segmentInfo.appendChild(segmentType);
            segmentInfo.appendChild(segmentWpCount);
            
            const menuBtn = document.createElement('button');
            menuBtn.className = 'segment-menu-btn';
            menuBtn.innerHTML = '⋮';
            menuBtn.title = 'Menu segmentu';
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showSegmentMenu(e, index, segment);
            });
            
            segmentItem.appendChild(segmentInfo);
            segmentItem.appendChild(menuBtn);
            
            // Click to activate segment
            segmentItem.addEventListener('click', () => {
                if (this._onSegmentClick && index !== activeSegmentIndex) {
                    this._onSegmentClick(index);
                }
            });
            
            this._segmentsList.appendChild(segmentItem);
        });
    }
    
    /**
     * Show segment context menu
     * @private
     */
    _showSegmentMenu(event, segmentIndex, segment) {
        if (!this._segmentMenu) return;
        
        // Position menu near the button
        const rect = event.target.getBoundingClientRect();
        const panelRect = this._attributesPanel.getBoundingClientRect();
        
        this._segmentMenu.style.top = `${rect.bottom - panelRect.top}px`;
        this._segmentMenu.style.right = '10px';
        this._segmentMenu.dataset.segmentIndex = segmentIndex;
        
        // Show/hide mode change options based on current mode
        const toRoutingItem = document.getElementById('menu-segment-to-routing');
        const toManualItem = document.getElementById('menu-segment-to-manual');
        
        if (toRoutingItem && toManualItem) {
            if (segment.mode === 'routing') {
                toRoutingItem.style.display = 'none';
                toManualItem.style.display = 'flex';
            } else {
                toRoutingItem.style.display = 'flex';
                toManualItem.style.display = 'none';
                
                // Check if can convert to routing (waypoint limit)
                if (segment.waypoints.length > CONFIG.MAX_WAYPOINTS_PER_API_CALL) {
                    toRoutingItem.style.display = 'none';
                }
            }
        }
        
        this._segmentMenu.classList.add('visible');
    }
    
    /**
     * Reset form state (collapsible sections, etc.)
     * Call this when opening edit mode for a route
     */
    resetFormState() {
        // Reset custom data toggle to collapsed
        this._customDataContent.style.display = 'none';
        this._customDataToggle.querySelector('.toggle-icon').textContent = '▶';
    }
    
    /**
     * Update the routes list
     * @param {Array} routes - All routes
     * @param {Array} filteredRoutes - Filtered routes to display
     */
    updateRoutesList(routes, filteredRoutes) {
        // Update count display
        this._routesCount.textContent = `${filteredRoutes.length}/${routes.length}`;
        
        if (filteredRoutes.length === 0) {
            if (routes.length === 0) {
                this._routesList.innerHTML = '<div class="routes-list-empty">Zatím nejsou vytvořeny žádné trasy</div>';
            } else {
                this._routesList.innerHTML = '<div class="routes-list-empty">Žádné trasy odpovídající hledání</div>';
            }
            return;
        }
        
        this._routesList.innerHTML = '';
        filteredRoutes.forEach(route => {
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            routeItem.dataset.routeId = route.id;
            
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'route-color-indicator';
            colorIndicator.style.backgroundColor = route.getColor();
            
            const textDiv = document.createElement('div');
            textDiv.className = 'route-item-text';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'route-item-name';
            nameDiv.textContent = route.getTitle();
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'route-item-info';
            const segmentCount = route.segments.length;
            const segmentText = segmentCount === 1 ? '1 segment' : `${segmentCount} segmentů`;
            infoDiv.textContent = `${route.getSubtitle()} • ${segmentText}`;
            
            textDiv.appendChild(nameDiv);
            textDiv.appendChild(infoDiv);
            
            routeItem.appendChild(colorIndicator);
            routeItem.appendChild(textDiv);
            
            // Click handler
            routeItem.addEventListener('click', () => {
                if (this._onRouteClick) {
                    this._onRouteClick(route.id);
                }
            });
            
            // Hover handlers
            routeItem.addEventListener('mouseenter', () => {
                if (this._onRouteHover) {
                    this._onRouteHover(route.id, true);
                }
            });
            
            routeItem.addEventListener('mouseleave', () => {
                if (this._onRouteHover) {
                    this._onRouteHover(route.id, false);
                }
            });
            
            this._routesList.appendChild(routeItem);
        });
    }
    
    /**
     * Show import panel
     */
    showImportPanel() {
        this._importPanel.style.display = 'block';
        this._dropzone.classList.add('visible');
    }
    
    /**
     * Hide import panel
     */
    hideImportPanel() {
        this._importPanel.style.display = 'none';
        this._dropzone.classList.remove('visible');
    }
    
    /**
     * Show import loading state
     */
    showImportLoading() {
        document.querySelector('.dropzone-content').style.display = 'none';
        document.getElementById('dropzone-loading').style.display = 'flex';
    }
    
    /**
     * Hide import loading state
     */
    hideImportLoading() {
        document.getElementById('dropzone-loading').style.display = 'none';
        document.querySelector('.dropzone-content').style.display = 'block';
    }
}

// Singleton instance
export const panelManager = new PanelManager();
