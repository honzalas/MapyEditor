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
        this._justOpened = false;
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
     * Show the routes menu
     * @param {number} x - X position (pixels)
     * @param {number} y - Y position (pixels)
     * @param {Array} routeResults - Array of {route, distance, pixelDistance}
     */
    show(x, y, routeResults) {
        if (!routeResults || routeResults.length === 0) {
            return;
        }
        
        // Clear existing items
        this._listElement.innerHTML = '';
        
        // Add route items
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
