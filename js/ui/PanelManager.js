/**
 * MapyEditor - Panel Manager
 * Manages the right panel UI (routes list, attributes, import/export)
 */

import { COLOR_MAP } from '../config.js';

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
        this._routeNameInput = null;
        this._routeColorSelect = null;
        this._importPanel = null;
        this._dropzone = null;
        this._routeMenu = null;
        
        // Callbacks
        this._onRouteClick = null;
        this._onRouteHover = null;
        this._onNameChange = null;
        this._onColorChange = null;
        this._onSave = null;
        this._onCancel = null;
        this._onCreateRoute = null;
        this._onImport = null;
        this._onExport = null;
        this._onDeleteRoute = null;
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
        this._routeNameInput = document.getElementById('route-name');
        this._routeColorSelect = document.getElementById('route-color');
        this._importPanel = document.getElementById('import-panel');
        this._dropzone = document.getElementById('dropzone');
        this._routeMenu = document.getElementById('route-menu');
        
        this._bindEvents();
    }
    
    /**
     * Bind event handlers
     * @private
     */
    _bindEvents() {
        // Route name change
        this._routeNameInput.addEventListener('input', () => {
            if (this._onNameChange) {
                this._onNameChange(this._routeNameInput.value);
            }
        });
        
        // Route color change
        this._routeColorSelect.addEventListener('change', () => {
            if (this._onColorChange) {
                this._onColorChange(this._routeColorSelect.value);
            }
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
        });
        
        // Search input
        document.getElementById('route-search-input').addEventListener('input', (e) => {
            if (this._onSearchChange) {
                this._onSearchChange(e.target.value);
            }
        });
    }
    
    // ==================
    // CALLBACKS SETTERS
    // ==================
    
    setRouteClickCallback(callback) { this._onRouteClick = callback; }
    setRouteHoverCallback(callback) { this._onRouteHover = callback; }
    setNameChangeCallback(callback) { this._onNameChange = callback; }
    setColorChangeCallback(callback) { this._onColorChange = callback; }
    setSaveCallback(callback) { this._onSave = callback; }
    setCancelCallback(callback) { this._onCancel = callback; }
    setCreateRouteCallback(callback) { this._onCreateRoute = callback; }
    setImportCallback(callback) { this._onImport = callback; }
    setExportCallback(callback) { this._onExport = callback; }
    setDeleteRouteCallback(callback) { this._onDeleteRoute = callback; }
    setSearchChangeCallback(callback) { this._onSearchChange = callback; }
    
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
     */
    updateUI(state) {
        const { isEditing, activeRoute } = state;
        
        // Disable/enable buttons based on mode
        document.getElementById('btn-create-route').disabled = isEditing;
        document.getElementById('btn-export-gpx').disabled = isEditing;
        document.getElementById('btn-import-gpx').disabled = isEditing;
        
        if (isEditing && activeRoute) {
            // Update status bar
            if (activeRoute.waypoints.length === 0) {
                this.setStatusText(`Nová trasa: ${activeRoute.name || 'Bez názvu'} - klikněte pro start`);
            } else {
                const wpCount = activeRoute.waypoints.length;
                this.setStatusText(`Úprava trasy: ${activeRoute.name || 'Bez názvu'} (${wpCount} bodů)`);
            }
            
            // Hide routes list, show attributes panel
            this._routesListContainer.classList.add('hidden');
            this._attributesPanel.style.display = 'block';
            this._routeNameInput.value = activeRoute.name || '';
            this._routeColorSelect.value = activeRoute.color || 'red';
            
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
            colorIndicator.style.backgroundColor = COLOR_MAP[route.color] || COLOR_MAP.red;
            
            const textDiv = document.createElement('div');
            textDiv.className = 'route-item-text';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'route-item-name';
            nameDiv.textContent = route.name || 'Bez názvu';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'route-item-info';
            infoDiv.textContent = `${route.waypoints.length} bodů`;
            
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


