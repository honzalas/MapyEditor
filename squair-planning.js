/**
 * SquairPlanning - Interactive route planner with Cell grid support
 * Allows users to plan routes by clicking on map with cell grid overlay
 * 
 * @version 1.0
 * @author PPGLog Team
 * @created 2025-10-02
 */
class SquairPlanning {
    constructor(config) {
        // Validate required parameters
        if (!config.map) {
            throw new Error('SquairPlanning: map parameter is required');
        }

        // Configuration with defaults
        this.config = {
            map: config.map,
            pilotCellsApiUrl: config.pilotCellsApiUrl || null,
            showPilotCellsControl: config.showPilotCellsControl || false,
            cellZoom: config.cellZoom || 13,
            routeColor: config.routeColor || '#E61B1B',
            routeWeight: config.routeWeight || 4,
            markerColor: config.markerColor || '#E61B1B'
        };

        // Internal state
        this.routePoints = [];
        this.routeMarkers = [];
        this.routeLine = null;
        this.cellGridLayer = null;
        this.pilotCellsControl = null;
        this.isDragging = false;
        this.insertMarker = null; // Marker for inserting new points on line
        this.insertSegmentIndex = -1; // Which segment is hovered

        // Initialize component
        this.init();
    }

    /**
     * Initialize the route planner
     */
    init() {
        try {
            this.setupMapEvents();
            this.setupUIEvents();
            this.createCellGrid();
            this.setupPilotCells();
            
            console.log('SquairPlanning: Initialized successfully');
        } catch (error) {
            console.error('SquairPlanning: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Setup map event handlers
     */
    setupMapEvents() {
        // Handle map clicks for adding route points
        this.config.map.on('click', (e) => {
            if (!this.isDragging) {
                // Check if clicking on insert marker
                if (this.insertMarker && this.insertSegmentIndex >= 0) {
                    const pos = this.insertMarker.getLatLng();
                    this.insertPointAtSegment(this.insertSegmentIndex, pos.lat, pos.lng);
                    this.hideInsertMarker();
                } else {
                    this.addRoutePoint(e.latlng.lat, e.latlng.lng);
                }
            }
        });

        // Handle mouse move for insert marker
        this.config.map.on('mousemove', (e) => {
            if (this.routePoints.length >= 2 && !this.isDragging) {
                this.updateInsertMarker(e.latlng);
            }
        });

        // Update cell grid when map zoom changes
        this.config.map.on('zoomend', () => {
            this.updateCellGridVisibility();
        });

        // Update cell grid when map moves
        this.config.map.on('moveend', () => {
            if (this.cellGridLayer && this.config.map.hasLayer(this.cellGridLayer)) {
                this.updateCellGrid();
            }
        });
    }

    /**
     * Setup UI event handlers
     */
    setupUIEvents() {

        // Clear route button
        const clearButton = document.getElementById('clearRoute');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearRoute();
            });
        }

        // Export buttons
        const exportGpxButton = document.getElementById('exportGPX');
        if (exportGpxButton) {
            exportGpxButton.addEventListener('click', () => {
                this.exportGPX();
            });
        }

        const exportXcTaskButton = document.getElementById('exportXCTask');
        if (exportXcTaskButton) {
            exportXcTaskButton.addEventListener('click', () => {
                this.exportXCTask();
            });
        }
    }

    /**
     * Setup pilot cells control if available
     */
    setupPilotCells() {
        if (this.config.showPilotCellsControl && this.config.pilotCellsApiUrl) {
            try {
                this.pilotCellsControl = new CellsMapControl({
                    map: this.config.map,
                    apiUrl: this.config.pilotCellsApiUrl,
                    layerName: 'Moje Squairy',
                    controlLabel: 'Moje Squairy',
                    controlId: 'leafletPilotCellsToggle',
                    position: 'topright',
                    tooltip: 'Zobrazit/skrýt moje získané cell',
                    cellType: 'pilot'
                });
                
                console.log('SquairPlanning: Pilot cells control initialized');
            } catch (error) {
                console.error('SquairPlanning: Failed to initialize pilot cells control:', error);
            }
        }
    }

    /**
     * Create and display cell grid overlay
     */
    createCellGrid() {
        this.cellGridLayer = L.layerGroup();
        this.updateCellGrid();
        this.config.map.addLayer(this.cellGridLayer);
    }

    /**
     * Update cell grid based on current map view
     */
    updateCellGrid() {
        if (!this.cellGridLayer) return;

        // Clear existing grid
        this.cellGridLayer.clearLayers();

        // Only show grid at appropriate zoom levels
        const currentZoom = this.config.map.getZoom();
        if (currentZoom < 10) {
            return; // Don't show grid at very low zoom levels
        }

        const bounds = this.config.map.getBounds();
        const gridLines = this.calculateCellGridLines(bounds, this.config.cellZoom);

        // Add grid lines to layer
        gridLines.forEach(line => {
            const polyline = L.polyline(line, {
                color: '#FF6B35',
                weight: 2,
                opacity: 0.7,
                interactive: false
            });
            this.cellGridLayer.addLayer(polyline);
        });
    }

    /**
     * Calculate grid lines for cell overlay
     */
    calculateCellGridLines(bounds, zoom) {
        const lines = [];
        const n = Math.pow(2, zoom);
        
        // Get tile bounds for current view
        const nwTile = this.latLngToTile(bounds.getNorthWest(), zoom);
        const seTile = this.latLngToTile(bounds.getSouthEast(), zoom);
        
        // Expand by one tile in each direction to ensure coverage
        const minX = Math.max(0, nwTile.x - 1);
        const maxX = Math.min(n - 1, seTile.x + 1);
        const minY = Math.max(0, nwTile.y - 1);
        const maxY = Math.min(n - 1, seTile.y + 1);

        // Vertical lines
        for (let x = minX; x <= maxX + 1; x++) {
            const lng = this.tileToLng(x, zoom);
            const line = [
                [bounds.getNorth(), lng],
                [bounds.getSouth(), lng]
            ];
            lines.push(line);
        }

        // Horizontal lines
        for (let y = minY; y <= maxY + 1; y++) {
            const lat = this.tileToLat(y, zoom);
            const line = [
                [lat, bounds.getWest()],
                [lat, bounds.getEast()]
            ];
            lines.push(line);
        }

        return lines;
    }

    /**
     * Convert lat/lng to tile coordinates
     */
    latLngToTile(latlng, zoom) {
        const n = Math.pow(2, zoom);
        const lat = Math.max(-85.05112878, Math.min(85.05112878, latlng.lat));
        const lng = latlng.lng;

        const x = Math.floor((lng + 180.0) / 360.0 * n);
        const latRad = lat * Math.PI / 180.0;
        const y = Math.floor((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0 * n);

        return { x: x, y: y };
    }

    /**
     * Convert tile X coordinate to longitude
     */
    tileToLng(x, zoom) {
        const n = Math.pow(2, zoom);
        return x / n * 360.0 - 180.0;
    }

    /**
     * Convert tile Y coordinate to latitude
     */
    tileToLat(y, zoom) {
        const n = Math.pow(2, zoom);
        const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
        return latRad * 180.0 / Math.PI;
    }

    /**
     * Update cell grid visibility based on zoom level
     */
    updateCellGridVisibility() {
        // Grid is always visible, just update it
        this.updateCellGrid();
    }

    /**
     * Create insert marker icon
     */
    createInsertMarkerIcon() {
        return L.divIcon({
            className: 'insert-marker',
            html: `<div style="
                background-color: #4CAF50;
                color: white;
                border: 2px solid white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: crosshair;
                pointer-events: auto;
            ">+</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    /**
     * Update insert marker position based on mouse location
     */
    updateInsertMarker(latlng) {
        if (this.routePoints.length < 2) {
            this.hideInsertMarker();
            return;
        }

        // Check if mouse is near any existing point (within 25 pixels)
        const mousePoint = this.config.map.latLngToContainerPoint([latlng.lat, latlng.lng]);
        for (let i = 0; i < this.routePoints.length; i++) {
            const routePoint = this.routePoints[i];
            const pointPixels = this.config.map.latLngToContainerPoint([routePoint.lat, routePoint.lng]);
            const distanceToPoint = Math.sqrt(
                Math.pow(mousePoint.x - pointPixels.x, 2) + 
                Math.pow(mousePoint.y - pointPixels.y, 2)
            );
            
            // If near existing point, hide insert marker
            if (distanceToPoint < 25) {
                this.hideInsertMarker();
                return;
            }
        }

        // Find closest segment
        let closestSegment = -1;
        let minDistance = Infinity;
        let closestPoint = null;

        for (let i = 0; i < this.routePoints.length - 1; i++) {
            const p1 = this.routePoints[i];
            const p2 = this.routePoints[i + 1];

            // Get closest point on segment
            const closest = this.getClosestPointOnSegment(
                latlng.lat, latlng.lng,
                p1.lat, p1.lng,
                p2.lat, p2.lng
            );

            // Calculate distance in pixels
            const point1 = this.config.map.latLngToContainerPoint([closest.lat, closest.lng]);
            const point2 = this.config.map.latLngToContainerPoint([latlng.lat, latlng.lng]);
            const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + 
                Math.pow(point1.y - point2.y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestSegment = i;
                closestPoint = closest;
            }
        }

        // Show insert marker if close enough (within 15 pixels) and not near existing point
        if (minDistance < 15 && closestPoint) {
            this.showInsertMarker(closestPoint.lat, closestPoint.lng, closestSegment);
        } else {
            this.hideInsertMarker();
        }
    }

    /**
     * Get closest point on line segment
     */
    getClosestPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        if (dx === 0 && dy === 0) {
            return { lat: x1, lng: y1 };
        }

        const t = Math.max(0, Math.min(1, 
            ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
        ));

        return {
            lat: x1 + t * dx,
            lng: y1 + t * dy
        };
    }

    /**
     * Show insert marker at position
     */
    showInsertMarker(lat, lng, segmentIndex) {
        this.insertSegmentIndex = segmentIndex;

        if (!this.insertMarker) {
            this.insertMarker = L.marker([lat, lng], {
                icon: this.createInsertMarkerIcon(),
                interactive: true,
                zIndexOffset: 1000
            });
            
            // Add hover effect - change cursor
            this.insertMarker.on('mouseover', () => {
                this.config.map.getContainer().style.cursor = 'crosshair';
            });
            
            this.insertMarker.on('mouseout', () => {
                this.config.map.getContainer().style.cursor = '';
            });
            
            this.insertMarker.addTo(this.config.map);
        } else {
            this.insertMarker.setLatLng([lat, lng]);
        }
    }

    /**
     * Hide insert marker
     */
    hideInsertMarker() {
        if (this.insertMarker) {
            this.config.map.removeLayer(this.insertMarker);
            this.insertMarker = null;
            // Reset cursor
            this.config.map.getContainer().style.cursor = '';
        }
        this.insertSegmentIndex = -1;
    }

    /**
     * Insert point at segment
     */
    insertPointAtSegment(segmentIndex, lat, lng) {
        if (segmentIndex < 0 || segmentIndex >= this.routePoints.length - 1) {
            return;
        }

        // Create new point
        const newIndex = segmentIndex + 1;
        const num = (newIndex + 1).toString();
        const point = {
            lat: lat,
            lng: lng,
            name: `WP${num.length < 2 ? '0' + num : num}`
        };

        // Insert point into array
        this.routePoints.splice(newIndex, 0, point);

        // Recreate all markers with correct numbering
        this.updateMarkerNumbers();
        this.updateRouteLine();
        this.updateRoutePointsList();
        this.updateRouteStats();
        this.updateExportButtons();

        console.log(`Inserted route point at segment ${segmentIndex}`);
    }

    /**
     * Add a new route point
     */
    addRoutePoint(lat, lng) {
        const pointIndex = this.routePoints.length;
        const num = (pointIndex + 1).toString();
        const point = {
            lat: lat,
            lng: lng,
            name: `WP${num.length < 2 ? '0' + num : num}`
        };

        this.routePoints.push(point);

        // Create draggable marker
        const marker = L.marker([lat, lng], {
            draggable: true,
            icon: this.createRouteMarkerIcon(pointIndex + 1)
        });

        // Setup marker events
        marker.on('dragstart', () => {
            this.isDragging = true;
        });

        marker.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            this.routePoints[pointIndex].lat = newPos.lat;
            this.routePoints[pointIndex].lng = newPos.lng;
            this.updateRouteLine();
            this.updateRouteStats();
        });

        marker.on('dragend', () => {
            setTimeout(() => {
                this.isDragging = false;
            }, 100);
            this.updateRoutePointsList();
        });

        marker.addTo(this.config.map);
        this.routeMarkers.push(marker);

        this.updateRouteLine();
        this.updateRoutePointsList();
        this.updateRouteStats();
        this.updateExportButtons();

        console.log(`Added route point ${pointIndex + 1} at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }

    /**
     * Create custom icon for route markers
     */
    createRouteMarkerIcon(number) {
        return L.divIcon({
            className: 'route-marker',
            html: `<div style="
                background-color: ${this.config.markerColor};
                color: white;
                border: 2px solid white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${number}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    /**
     * Update route line on map
     */
    updateRouteLine() {
        // Remove existing line
        if (this.routeLine) {
            this.config.map.removeLayer(this.routeLine);
        }

        // Create new line if we have at least 2 points
        if (this.routePoints.length >= 2) {
            const latlngs = this.routePoints.map(p => [p.lat, p.lng]);
            this.routeLine = L.polyline(latlngs, {
                color: this.config.routeColor,
                weight: this.config.routeWeight,
                opacity: 0.8,
                interactive: false
            });
            this.routeLine.addTo(this.config.map);
        }
    }

    /**
     * Update route points list in UI
     */
    updateRoutePointsList() {
        const listContainer = document.getElementById('routePointsList');
        const noPointsMessage = document.getElementById('noPointsMessage');
        
        if (!listContainer) return;

        // Clear existing content
        listContainer.innerHTML = '';

        if (this.routePoints.length === 0) {
            listContainer.appendChild(noPointsMessage);
            return;
        }

        this.routePoints.forEach((point, index) => {
            const listItem = this.createRoutePointListItem(point, index);
            listContainer.appendChild(listItem);
        });
    }

    /**
     * Create list item for route point
     */
    createRoutePointListItem(point, index) {
        const div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
        
        const distance = index > 0 ? this.calculateDistance(
            this.routePoints[index - 1].lat, this.routePoints[index - 1].lng,
            point.lat, point.lng
        ) : 0;

        div.innerHTML = `
            <div class="flex-fill">
                <div class="d-flex align-items-center">
                    <span class="badge badge-primary mr-2">${index + 1}</span>
                    <div>
                        <div class="font-weight-bold">${point.name}</div>
                        <small class="text-muted">
                            ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
                            ${distance > 0 ? `<br><i class="fas fa-route"></i> ${distance.toFixed(1)} km` : ''}
                        </small>
                    </div>
                </div>
            </div>
            <div class="btn-group-vertical btn-group-sm">
                <button type="button" class="btn btn-sm" onclick="routePlanner.movePointUp(${index})" ${index === 0 ? 'disabled' : ''} title="Posunout nahoru">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button type="button" class="btn  btn-sm" onclick="routePlanner.movePointDown(${index})" ${index === this.routePoints.length - 1 ? 'disabled' : ''} title="Posunout dolů">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button type="button" class="btn  btn-sm" onclick="routePlanner.removePoint(${index})" title="Smazat bod">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return div;
    }

    /**
     * Calculate distance between two points in kilometers
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Update route statistics
     */
    updateRouteStats() {
        const pointCountElement = document.getElementById('pointCount');
        const totalDistanceElement = document.getElementById('totalDistance');
        const routeStatsElement = document.getElementById('routeStats');

        if (!pointCountElement || !totalDistanceElement || !routeStatsElement) return;

        pointCountElement.textContent = this.routePoints.length;

        let totalDistance = 0;
        for (let i = 1; i < this.routePoints.length; i++) {
            totalDistance += this.calculateDistance(
                this.routePoints[i - 1].lat, this.routePoints[i - 1].lng,
                this.routePoints[i].lat, this.routePoints[i].lng
            );
        }

        totalDistanceElement.textContent = `${totalDistance.toFixed(1)} km`;

        // Show/hide stats section
        if (this.routePoints.length > 0) {
            routeStatsElement.style.display = 'block';
        } else {
            routeStatsElement.style.display = 'none';
        }
    }

    /**
     * Update export buttons state
     */
    updateExportButtons() {
        const exportGpxButton = document.getElementById('exportGPX');
        const exportXcTaskButton = document.getElementById('exportXCTask');
        const clearButton = document.getElementById('clearRoute');

        const hasEnoughPoints = this.routePoints.length >= 2;

        if (exportGpxButton) {
            exportGpxButton.disabled = !hasEnoughPoints;
        }
        if (exportXcTaskButton) {
            exportXcTaskButton.disabled = !hasEnoughPoints;
        }
        if (clearButton) {
            clearButton.disabled = this.routePoints.length === 0;
        }
    }

    /**
     * Move route point up in the list
     */
    movePointUp(index) {
        if (index <= 0) return;

        // Swap points
        [this.routePoints[index - 1], this.routePoints[index]] = [this.routePoints[index], this.routePoints[index - 1]];
        
        // Swap markers
        [this.routeMarkers[index - 1], this.routeMarkers[index]] = [this.routeMarkers[index], this.routeMarkers[index - 1]];

        this.updateMarkerNumbers();
        this.updateRouteLine();
        this.updateRoutePointsList();
        this.updateRouteStats();
    }

    /**
     * Move route point down in the list
     */
    movePointDown(index) {
        if (index >= this.routePoints.length - 1) return;

        // Swap points
        [this.routePoints[index], this.routePoints[index + 1]] = [this.routePoints[index + 1], this.routePoints[index]];
        
        // Swap markers
        [this.routeMarkers[index], this.routeMarkers[index + 1]] = [this.routeMarkers[index + 1], this.routeMarkers[index]];

        this.updateMarkerNumbers();
        this.updateRouteLine();
        this.updateRoutePointsList();
        this.updateRouteStats();
    }

    /**
     * Remove route point
     */
    removePoint(index) {
        if (index < 0 || index >= this.routePoints.length) return;

        // Remove marker from map
        this.config.map.removeLayer(this.routeMarkers[index]);

        // Remove from arrays
        this.routePoints.splice(index, 1);
        this.routeMarkers.splice(index, 1);

        // Hide insert marker if less than 2 points remain
        if (this.routePoints.length < 2) {
            this.hideInsertMarker();
        }

        this.updateMarkerNumbers();
        this.updateRouteLine();
        this.updateRoutePointsList();
        this.updateRouteStats();
        this.updateExportButtons();
    }

    /**
     * Update marker numbers after reordering
     */
    updateMarkerNumbers() {
        // Remove all markers from map and clear event listeners
        this.routeMarkers.forEach(marker => {
            marker.off(); // Remove all event listeners
            this.config.map.removeLayer(marker);
        });

        // Clear markers array
        this.routeMarkers = [];

        // Recreate all markers with correct event listeners
        this.routePoints.forEach((point, index) => {
            const num = (index + 1).toString();
            point.name = `WP${num.length < 2 ? '0' + num : num}`;

            // Create new marker with correct position
            const marker = L.marker([point.lat, point.lng], {
                draggable: true,
                icon: this.createRouteMarkerIcon(index + 1)
            });

            // Setup marker events with correct index
            marker.on('dragstart', () => {
                this.isDragging = true;
                this.hideInsertMarker();
            });

            marker.on('drag', (e) => {
                const newPos = e.target.getLatLng();
                // Find current index (might have changed)
                const currentIndex = this.routeMarkers.indexOf(marker);
                if (currentIndex >= 0 && currentIndex < this.routePoints.length) {
                    this.routePoints[currentIndex].lat = newPos.lat;
                    this.routePoints[currentIndex].lng = newPos.lng;
                    this.updateRouteLine();
                    this.updateRouteStats();
                }
            });

            marker.on('dragend', () => {
                setTimeout(() => {
                    this.isDragging = false;
                }, 100);
                this.updateRoutePointsList();
            });

            marker.addTo(this.config.map);
            this.routeMarkers.push(marker);
        });
    }

    /**
     * Clear entire route
     */
    clearRoute() {
        // Remove all markers
        this.routeMarkers.forEach(marker => {
            this.config.map.removeLayer(marker);
        });

        // Remove route line
        if (this.routeLine) {
            this.config.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }

        // Hide insert marker
        this.hideInsertMarker();

        // Clear arrays
        this.routePoints = [];
        this.routeMarkers = [];

        this.updateRoutePointsList();
        this.updateRouteStats();
        this.updateExportButtons();

        console.log('Route cleared');
    }

    /**
     * Export route to GPX format
     * 
     * Uses hidden iframe approach for file download:
     * 1. User enters filename via prompt
     * 2. Route data is serialized to JSON and placed in hidden form field
     * 3. Form is submitted to hidden iframe (not main page)
     * 4. Browser automatically handles file download from iframe response
     * 5. Main page stays intact with all route data preserved
     * 
     * Benefits over fetch API approach:
     * - No need to manually parse Content-Disposition headers
     * - Browser handles download naturally (same as regular form submit)
     * - More reliable across different browsers
     * - Simpler code without blob manipulation
     */
    exportGPX() {
        if (this.routePoints.length < 2) {
            alert('Minimálně 2 body jsou potřeba pro export');
            return;
        }

        try {
            // Generate default filename with current date (RouteYYMMDD)
            const today = new Date();
            const year = today.getFullYear().toString().substring(2);
            const month = (today.getMonth() + 1).toString();
            const day = today.getDate().toString();
            const defaultName = `Route${year}${month.length < 2 ? '0' + month : month}${day.length < 2 ? '0' + day : day}`;
            
            // Ask user for filename
            const routeName = prompt('Název trasy:', defaultName);
            if (!routeName) return; // User cancelled

            // Prepare route data as JSON string
            const routeData = JSON.stringify({
                name: routeName,
                points: this.routePoints
            });

            // Put data into hidden form field
            const input = document.getElementById('gpxRouteDataInput');
            if (input) {
                input.value = routeData;
                
                // Submit form to hidden iframe
                // This triggers download without reloading the page
                const form = document.getElementById('exportGpxForm');
                if (form) {
                    form.submit();
                    console.log('GPX export initiated for:', routeName);
                }
            }
        } catch (error) {
            console.error('Export GPX failed:', error);
            alert('Chyba při exportu GPX: ' + error.message);
        }
    }

    /**
     * Export route to XCTask format
     * 
     * Uses the same hidden iframe approach as GPX export.
     * See exportGPX() method for detailed explanation of the technique.
     * 
     * XCTask format is used for cross-country task planning in paragliding apps.
     * The backend converts route points to GPX first, then to XCTask format.
     */
    exportXCTask() {
        if (this.routePoints.length < 2) {
            alert('Minimálně 2 body jsou potřeba pro export');
            return;
        }

        try {
            // Generate default filename with current date (RouteYYMMDD)
            const today = new Date();
            const year = today.getFullYear().toString().substring(2);
            const month = (today.getMonth() + 1).toString();
            const day = today.getDate().toString();
            const defaultName = `Route${year}${month.length < 2 ? '0' + month : month}${day.length < 2 ? '0' + day : day}`;
            
            // Ask user for filename
            const routeName = prompt('Název úlohy:', defaultName);
            if (!routeName) return; // User cancelled

            // Prepare route data as JSON string
            const routeData = JSON.stringify({
                name: routeName,
                points: this.routePoints
            });

            // Put data into hidden form field
            const input = document.getElementById('xctaskRouteDataInput');
            if (input) {
                input.value = routeData;
                
                // Submit form to hidden iframe
                // This triggers download without reloading the page
                const form = document.getElementById('exportXcTaskForm');
                if (form) {
                    form.submit();
                    console.log('XCTask export initiated for:', routeName);
                }
            }
        } catch (error) {
            console.error('Export XCTask failed:', error);
            alert('Chyba při exportu XCTask: ' + error.message);
        }
    }

    /**
     * Destroy the route planner and clean up resources
     */
    destroy() {
        this.clearRoute();
        
        if (this.cellGridLayer) {
            this.config.map.removeLayer(this.cellGridLayer);
            this.cellGridLayer = null;
        }

        if (this.pilotCellsControl) {
            this.pilotCellsControl.destroy();
            this.pilotCellsControl = null;
        }

        // Hide insert marker
        this.hideInsertMarker();

        // Remove event listeners
        this.config.map.off('click');
        this.config.map.off('mousemove');
        this.config.map.off('zoomend');
        this.config.map.off('moveend');

        console.log('SquairPlanning: Destroyed');
    }
}

/**
 * Export for both module and global usage
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SquairPlanning;
} else {
    window.SquairPlanning = SquairPlanning;
}
