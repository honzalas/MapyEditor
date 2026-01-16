/**
 * MapyEditor - Routes Menu
 * Handles the routes selection menu for map right-click
 */

/**
 * Manages the routes menu UI
 */
class RoutesMenu {
    constructor() {
        this._element = null;
        this._listElement = null;
        this._onRouteSelect = null;
        this._onAddNote = null;
        this._onOpenMapy = null;
        this._justOpened = false;
        this._latlng = null; // Store latlng for adding note
    }
    
    /**
     * Initialize the routes menu
     */
    initialize() {
        this._element = document.getElementById('routes-menu');
        this._listElement = document.getElementById('routes-menu-list');
        
        // Hide on any click outside
        document.addEventListener('click', () => {
            // Ignore click if menu was just opened
            if (this._justOpened) {
                return;
            }
            this.hide();
        });
        
        // Prevent menu from closing when clicking inside it
        this._element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Set route select callback
     * @param {Function} callback - (routeId) => void
     */
    setRouteSelectCallback(callback) {
        this._onRouteSelect = callback;
    }
    
    /**
     * Set add note callback
     * @param {Function} callback - (latlng) => void
     */
    setAddNoteCallback(callback) {
        this._onAddNote = callback;
    }
    
    /**
     * Set open Mapy.com callback
     * @param {Function} callback - (latlng) => void
     */
    setOpenMapyCallback(callback) {
        this._onOpenMapy = callback;
    }
    
    /**
     * Show the routes menu
     * @param {number} x - X position (pixels)
     * @param {number} y - Y position (pixels)
     * @param {Array} routeResults - Array of {route, distance, pixelDistance}
     * @param {Object} latlng - Optional latlng for adding note
     */
    show(x, y, routeResults, latlng = null) {
        this._latlng = latlng;
        
        // Clear existing items
        this._listElement.innerHTML = '';
        
        const hasRoutes = routeResults && routeResults.length > 0;
        
        // Add route items
        if (hasRoutes) {
            routeResults.forEach(result => {
                const route = result.route;
                const item = document.createElement('div');
                item.className = 'routes-menu-item';
                
                // Color indicator
                const colorDiv = document.createElement('div');
                colorDiv.className = 'routes-menu-item-color';
                colorDiv.style.backgroundColor = route.getColor();
                
                // Content wrapper
                const contentDiv = document.createElement('div');
                contentDiv.className = 'routes-menu-item-content';
                
                // Route title
                const titleDiv = document.createElement('div');
                titleDiv.className = 'routes-menu-item-name';
                titleDiv.textContent = route.getTitle();
                
                // Route subtitle
                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'routes-menu-item-subtitle';
                subtitleDiv.textContent = route.getSubtitle();
                
                contentDiv.appendChild(titleDiv);
                contentDiv.appendChild(subtitleDiv);
                
                item.appendChild(colorDiv);
                item.appendChild(contentDiv);
                
                // Click handler
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._onRouteSelect) {
                        this._onRouteSelect(route.id);
                    }
                    this.hide();
                });
                
                this._listElement.appendChild(item);
            });
        }
        
        // Add "Add note" option at the bottom
        if (latlng) {
            // Only add separator if there are routes above
            if (hasRoutes) {
                const separator = document.createElement('div');
                separator.className = 'routes-menu-separator';
                this._listElement.appendChild(separator);
            }
            
            const addNoteItem = document.createElement('div');
            addNoteItem.className = 'routes-menu-item';
            
            const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            iconSvg.setAttribute('viewBox', '0 0 24 24');
            iconSvg.setAttribute('fill', 'none');
            iconSvg.setAttribute('stroke', 'currentColor');
            iconSvg.setAttribute('stroke-width', '2');
            iconSvg.style.width = '16px';
            iconSvg.style.height = '16px';
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 5v14M5 12h14');
            iconSvg.appendChild(path);
            
            const text = document.createElement('span');
            text.textContent = 'Přidat poznámku';
            
            addNoteItem.appendChild(iconSvg);
            addNoteItem.appendChild(text);
            
            addNoteItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._onAddNote && this._latlng) {
                    this._onAddNote(this._latlng);
                }
                this.hide();
            });
            
            this._listElement.appendChild(addNoteItem);
            
            // Add "Open Mapy.com" option
            const openMapyItem = document.createElement('div');
            openMapyItem.className = 'routes-menu-item';
            
            const mapyIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            mapyIconSvg.setAttribute('viewBox', '0 0 24 24');
            mapyIconSvg.setAttribute('fill', 'none');
            mapyIconSvg.setAttribute('stroke', 'currentColor');
            mapyIconSvg.setAttribute('stroke-width', '2');
            mapyIconSvg.style.width = '16px';
            mapyIconSvg.style.height = '16px';
            
            const mapyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            mapyPath.setAttribute('d', 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z');
            mapyIconSvg.appendChild(mapyPath);
            
            const mapyText = document.createElement('span');
            mapyText.textContent = 'Otevřít na Mapy.com';
            
            openMapyItem.appendChild(mapyIconSvg);
            openMapyItem.appendChild(mapyText);
            
            openMapyItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._onOpenMapy && this._latlng) {
                    this._onOpenMapy(this._latlng);
                }
                this.hide();
            });
            
            this._listElement.appendChild(openMapyItem);
        }
        
        // Hide header if no routes
        const header = this._element.querySelector('.routes-menu-header');
        if (header) {
            header.style.display = hasRoutes ? 'block' : 'none';
        }
        
        // Position the menu
        this._element.style.left = x + 'px';
        this._element.style.top = y + 'px';
        this._element.style.display = 'block';
        
        // Set flag to prevent immediate closing
        this._justOpened = true;
        setTimeout(() => {
            this._justOpened = false;
        }, 100);
        
        // Adjust position if it goes off screen
        setTimeout(() => {
            const rect = this._element.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                this._element.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                this._element.style.top = (y - rect.height) + 'px';
            }
        }, 0);
    }
    
    /**
     * Hide the routes menu
     */
    hide() {
        if (this._element) {
            this._element.style.display = 'none';
        }
    }
    
    /**
     * Check if menu is visible
     * @returns {boolean}
     */
    isVisible() {
        return this._element && this._element.style.display === 'block';
    }
}

// Singleton instance
export const routesMenu = new RoutesMenu();
