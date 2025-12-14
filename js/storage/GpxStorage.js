/**
 * MapyEditor - GPX Storage
 * Implementation of StorageInterface for GPX file format
 * 
 * See Docs/gpxStorage.md for GPX format specification
 */

import { StorageInterface } from './StorageInterface.js';
import { Route } from '../models/DataStore.js';
import { ROUTE_COLOR_ENUM, LEGACY_COLOR_MAP } from '../config.js';

/**
 * GPX Storage implementation
 * Handles import/export of routes to GPX file format
 */
export class GpxStorage extends StorageInterface {
    constructor() {
        super();
    }
    
    getType() {
        return 'gpx';
    }
    
    supportsIndividualOperations() {
        return false; // GPX works with files, not individual routes
    }
    
    // ==================
    // EXPORT
    // ==================
    
    /**
     * Export routes to GPX and trigger download
     * @param {Array} routes - Array of route objects
     * @returns {Promise<boolean>}
     */
    async saveAll(routes) {
        // Filter routes with at least 2 waypoints
        const validRoutes = routes.filter(r => r.waypoints && r.waypoints.length >= 2);
        
        if (validRoutes.length === 0) {
            return false;
        }
        
        const gpxContent = this._generateGpx(validRoutes);
        const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
        
        if ('showSaveFilePicker' in window) {
            return await this._saveFileModern(blob);
        } else {
            this._saveFileFallback(blob);
            return true;
        }
    }
    
    /**
     * Generate GPX XML content
     * @private
     */
    _generateGpx(routes) {
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="MapyEditorBeta" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:mapy="http://mapyeditor.local/gpx/1">\n';

        routes.forEach(route => {
            gpx += '  <trk>\n';
            
            // Standard GPX name element (for compatibility)
            if (route.name) {
                gpx += `    <name>${this._escapeXml(route.name)}</name>\n`;
            }
            
            // Route attributes in extensions
            gpx += '    <extensions>\n';
            gpx += this._generateRouteExtensions(route);
            gpx += '    </extensions>\n';
            
            // Export each segment as a trkseg
            if (route.segments && route.segments.length > 0) {
                for (let segIdx = 0; segIdx < route.segments.length; segIdx++) {
                    const segment = route.segments[segIdx];
                    gpx += '    <trkseg>\n';
                    gpx += '      <extensions>\n';
                    gpx += `        <gpxx:SegmentMode>${segment.mode}</gpxx:SegmentMode>\n`;
                    
                    if (segment.mode === 'routing') {
                        // Save start, end, and waypoints for routing segments
                        const startWp = route.waypoints[segment.startIndex];
                        const endWp = route.waypoints[segment.endIndex];
                        gpx += `        <gpxx:StartPoint lat="${startWp.lat}" lon="${startWp.lon}"/>\n`;
                        gpx += `        <gpxx:EndPoint lat="${endWp.lat}" lon="${endWp.lon}"/>\n`;
                        
                        // Middle waypoints
                        if (segment.waypointIndices.length > 2) {
                            gpx += '        <gpxx:Waypoints>\n';
                            for (let i = 1; i < segment.waypointIndices.length - 1; i++) {
                                const wp = route.waypoints[segment.waypointIndices[i]];
                                gpx += `          <gpxx:Waypoint lat="${wp.lat}" lon="${wp.lon}"/>\n`;
                            }
                            gpx += '        </gpxx:Waypoints>\n';
                        }
                    }
                    
                    gpx += '      </extensions>\n';
                    
                    // Geometry points
                    segment.geometry.forEach(coord => {
                        gpx += `      <trkpt lat="${coord.lat}" lon="${coord.lon}"></trkpt>\n`;
                    });
                    
                    gpx += '    </trkseg>\n';
                }
            } else if (route.waypoints.length > 0) {
                // Fallback: single segment with all waypoints
                gpx += '    <trkseg>\n';
                route.waypoints.forEach(wp => {
                    gpx += `      <trkpt lat="${wp.lat}" lon="${wp.lon}"></trkpt>\n`;
                });
                gpx += '    </trkseg>\n';
            }
            
            gpx += '  </trk>\n';
        });

        gpx += '</gpx>';
        return gpx;
    }
    
    /**
     * Save file using modern File System Access API
     * @private
     */
    async _saveFileModern(blob) {
        try {
            const filename = this._generateFilename();
            const options = {
                types: [{
                    description: 'GPX soubory',
                    accept: { 'application/gpx+xml': ['.gpx'] }
                }],
                suggestedName: filename
            };
            
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Save error:', err);
                this._saveFileFallback(blob);
            }
            return false;
        }
    }
    
    /**
     * Save file using traditional download
     * @private
     */
    _saveFileFallback(blob) {
        const filename = this._generateFilename();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Generate filename with timestamp
     * @private
     */
    _generateFilename() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `routes_${year}${month}${day}_${hours}${minutes}.gpx`;
    }
    
    /**
     * Generate route extensions XML
     * @private
     */
    _generateRouteExtensions(route) {
        let ext = '';
        
        // Required attribute
        ext += `      <mapy:routeType>${route.routeType || 'Hiking'}</mapy:routeType>\n`;
        
        // Optional attributes - only output if set
        if (route.color) {
            ext += `      <mapy:color>${route.color}</mapy:color>\n`;
        }
        if (route.customColor) {
            ext += `      <mapy:customColor>${this._escapeXml(route.customColor)}</mapy:customColor>\n`;
        }
        if (route.symbol) {
            ext += `      <mapy:symbol>${this._escapeXml(route.symbol)}</mapy:symbol>\n`;
        }
        if (route.name) {
            ext += `      <mapy:name>${this._escapeXml(route.name)}</mapy:name>\n`;
        }
        if (route.ref) {
            ext += `      <mapy:ref>${this._escapeXml(route.ref)}</mapy:ref>\n`;
        }
        if (route.network) {
            ext += `      <mapy:network>${route.network}</mapy:network>\n`;
        }
        if (route.wikidata) {
            ext += `      <mapy:wikidata>${this._escapeXml(route.wikidata)}</mapy:wikidata>\n`;
        }
        if (route.customData) {
            ext += `      <mapy:customData>${this._escapeXml(route.customData)}</mapy:customData>\n`;
        }
        
        return ext;
    }
    
    /**
     * Escape XML special characters
     * @private
     */
    _escapeXml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&apos;');
    }
    
    // ==================
    // IMPORT
    // ==================
    
    /**
     * Import routes from GPX file(s)
     * @param {File|FileList} files - File or FileList to import
     * @returns {Promise<Array>} Array of imported route objects
     */
    async loadAll(files) {
        const fileList = files instanceof FileList ? Array.from(files) : [files];
        const routes = [];
        
        for (const file of fileList) {
            if (file.name.toLowerCase().endsWith('.gpx')) {
                const fileRoutes = await this._importFile(file);
                routes.push(...fileRoutes);
            }
        }
        
        return routes;
    }
    
    /**
     * Import a single GPX file
     * @private
     */
    async _importFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const routes = this._parseGpx(e.target.result, file.name);
                resolve(routes);
            };
            reader.onerror = () => {
                console.error('Error reading file:', file.name);
                resolve([]);
            };
            reader.readAsText(file);
        });
    }
    
    /**
     * Parse GPX XML content
     * @private
     */
    _parseGpx(content, filename) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const tracks = xmlDoc.getElementsByTagName('trk');
        const routes = [];

        for (const trk of Array.from(tracks)) {
            const route = this._parseTrack(trk, filename);
            if (route) {
                routes.push(route);
            }
        }

        return routes;
    }
    
    /**
     * Parse a single track element
     * @private
     */
    _parseTrack(trk, filename) {
        const nameEl = trk.getElementsByTagName('name')[0];
        const gpxName = nameEl ? nameEl.textContent : null;
        
        // Initialize route attributes with defaults
        // Note: name is null by default, gpxName is only used for backward compatibility
        let routeAttrs = {
            routeType: 'Hiking',
            color: null,
            customColor: null,
            symbol: null,
            name: null,
            ref: null,
            network: 'Nwn',
            wikidata: null,
            customData: null
        };
        
        let oldRouteMode = null;
        let oldWaypoints = [];
        let isNewFormat = false;
        
        // Check for extensions at trk level
        const trkExtensions = trk.getElementsByTagName('extensions')[0];
        if (trkExtensions) {
            // Try to read new format attributes (mapy: namespace)
            const routeTypeEl = this._getExtensionElement(trkExtensions, 'routeType');
            if (routeTypeEl) {
                isNewFormat = true;
                routeAttrs.routeType = routeTypeEl.textContent || 'Hiking';
            }
            
            // Read all new format attributes
            const colorEl = this._getExtensionElement(trkExtensions, 'color');
            if (colorEl) routeAttrs.color = colorEl.textContent;
            
            const customColorEl = this._getExtensionElement(trkExtensions, 'customColor');
            if (customColorEl) routeAttrs.customColor = customColorEl.textContent;
            
            const symbolEl = this._getExtensionElement(trkExtensions, 'symbol');
            if (symbolEl) routeAttrs.symbol = symbolEl.textContent;
            
            const nameAttrEl = this._getExtensionElement(trkExtensions, 'name');
            if (nameAttrEl) routeAttrs.name = nameAttrEl.textContent;
            
            const refEl = this._getExtensionElement(trkExtensions, 'ref');
            if (refEl) routeAttrs.ref = refEl.textContent;
            
            const networkEl = this._getExtensionElement(trkExtensions, 'network');
            if (networkEl) routeAttrs.network = networkEl.textContent;
            
            const wikidataEl = this._getExtensionElement(trkExtensions, 'wikidata');
            if (wikidataEl) routeAttrs.wikidata = wikidataEl.textContent;
            
            const customDataEl = this._getExtensionElement(trkExtensions, 'customData');
            if (customDataEl) routeAttrs.customData = customDataEl.textContent;
            
            // Legacy format: DisplayColor
            if (!isNewFormat) {
                const displayColorEl = trkExtensions.getElementsByTagName('gpxx:DisplayColor')[0] || 
                                       trkExtensions.getElementsByTagName('DisplayColor')[0];
                if (displayColorEl) {
                    const colorValue = displayColorEl.textContent.toLowerCase();
                    // Map legacy color to new enum
                    if (LEGACY_COLOR_MAP[colorValue]) {
                        routeAttrs.color = LEGACY_COLOR_MAP[colorValue];
                    } else {
                        // Unknown color -> Other + customColor
                        routeAttrs.color = 'Other';
                        routeAttrs.customColor = displayColorEl.textContent;
                    }
                }
            }
            
            // Check for old format RouteMode
            const routeModeEl = trkExtensions.getElementsByTagName('gpxx:RouteMode')[0] || 
                               trkExtensions.getElementsByTagName('RouteMode')[0];
            if (routeModeEl) {
                oldRouteMode = routeModeEl.textContent.toLowerCase();
            }
            
            // Check for old format Waypoints
            const waypointsEl = trkExtensions.getElementsByTagName('gpxx:Waypoints')[0] || 
                               trkExtensions.getElementsByTagName('Waypoints')[0];
            if (waypointsEl) {
                const wpEls = waypointsEl.getElementsByTagName('gpxx:Waypoint');
                const wpEls2 = waypointsEl.getElementsByTagName('Waypoint');
                const wpArray = wpEls.length > 0 ? wpEls : wpEls2;
                oldWaypoints = Array.from(wpArray).map(wpEl => ({
                    lat: parseFloat(wpEl.getAttribute('lat')),
                    lon: parseFloat(wpEl.getAttribute('lon'))
                }));
            }
        }
        
        // Use GPX name as fallback if no name in extensions
        if (!routeAttrs.name && gpxName) {
            routeAttrs.name = gpxName;
        }
        
        const trksegs = trk.getElementsByTagName('trkseg');
        
        // Check if geometry format uses SegmentMode (for segment parsing)
        let hasSegmentMode = false;
        if (trksegs.length > 0) {
            const firstTrkseg = trksegs[0];
            const segExt = firstTrkseg.getElementsByTagName('extensions')[0];
            if (segExt) {
                const segModeEl = segExt.getElementsByTagName('gpxx:SegmentMode')[0] || 
                                 segExt.getElementsByTagName('SegmentMode')[0];
                if (segModeEl) {
                    hasSegmentMode = true;
                }
            }
        }
        
        if (hasSegmentMode) {
            return this._parseNewFormat(trksegs, routeAttrs);
        } else if (oldRouteMode) {
            return this._parseOldFormat(trksegs, routeAttrs, oldRouteMode, oldWaypoints);
        } else {
            return this._parseNoFormat(trksegs, routeAttrs);
        }
    }
    
    /**
     * Get extension element by name (supports multiple namespaces)
     * @private
     */
    _getExtensionElement(extensions, name) {
        return extensions.getElementsByTagName(`mapy:${name}`)[0] ||
               extensions.getElementsByTagName(name)[0];
    }
    
    /**
     * Parse new format GPX (with SegmentMode in trkseg extensions)
     * @private
     */
    _parseNewFormat(trksegs, routeAttrs) {
        const waypoints = [];
        const importedSegments = [];
        
        for (let segIdx = 0; segIdx < trksegs.length; segIdx++) {
            const trkseg = trksegs[segIdx];
            const segExt = trkseg.getElementsByTagName('extensions')[0];
            
            let segMode = 'manual';
            let startPoint = null;
            let endPoint = null;
            let segWaypoints = [];
            
            if (segExt) {
                const segModeEl = segExt.getElementsByTagName('gpxx:SegmentMode')[0] || 
                                 segExt.getElementsByTagName('SegmentMode')[0];
                if (segModeEl) {
                    segMode = segModeEl.textContent.toLowerCase();
                }
                
                const startEl = segExt.getElementsByTagName('gpxx:StartPoint')[0] || 
                               segExt.getElementsByTagName('StartPoint')[0];
                if (startEl) {
                    startPoint = {
                        lat: parseFloat(startEl.getAttribute('lat')),
                        lon: parseFloat(startEl.getAttribute('lon'))
                    };
                }
                
                const endEl = segExt.getElementsByTagName('gpxx:EndPoint')[0] || 
                             segExt.getElementsByTagName('EndPoint')[0];
                if (endEl) {
                    endPoint = {
                        lat: parseFloat(endEl.getAttribute('lat')),
                        lon: parseFloat(endEl.getAttribute('lon'))
                    };
                }
                
                const wpContainer = segExt.getElementsByTagName('gpxx:Waypoints')[0] || 
                                   segExt.getElementsByTagName('Waypoints')[0];
                if (wpContainer) {
                    const wpEls = wpContainer.getElementsByTagName('gpxx:Waypoint');
                    const wpEls2 = wpContainer.getElementsByTagName('Waypoint');
                    const wpArray = wpEls.length > 0 ? wpEls : wpEls2;
                    segWaypoints = Array.from(wpArray).map(el => ({
                        lat: parseFloat(el.getAttribute('lat')),
                        lon: parseFloat(el.getAttribute('lon'))
                    }));
                }
            }
            
            // Read geometry from trkpt
            const trkpts = trkseg.getElementsByTagName('trkpt');
            const geometry = Array.from(trkpts).map(pt => ({
                lat: parseFloat(pt.getAttribute('lat')),
                lon: parseFloat(pt.getAttribute('lon'))
            }));
            
            // Determine the previous segment info
            const prevSeg = importedSegments.length > 0 ? importedSegments[importedSegments.length - 1] : null;
            const boundaryWpIndex = prevSeg ? prevSeg.endIndex : -1;
            
            // Build waypoints for this segment
            if (segMode === 'routing') {
                if (segIdx === 0) {
                    // First segment: add startPoint
                    if (startPoint) {
                        waypoints.push({ ...startPoint, mode: 'start' });
                    }
                }
                
                // Add middle waypoints
                segWaypoints.forEach(wp => {
                    waypoints.push({ ...wp, mode: 'routing' });
                });
                
                // Add endPoint
                if (endPoint) {
                    waypoints.push({ ...endPoint, mode: 'routing' });
                }
            } else {
                // Manual segment: waypoints come from trkpt
                const startsFromPrevGeom = prevSeg && prevSeg.mode === 'routing';
                
                Array.from(trkpts).forEach((pt, ptIdx) => {
                    // Skip first trkpt if it's previousGeometryEnd
                    if (ptIdx === 0 && startsFromPrevGeom) {
                        return;
                    }
                    
                    const lat = parseFloat(pt.getAttribute('lat'));
                    const lon = parseFloat(pt.getAttribute('lon'));
                    
                    // Skip if matches boundary waypoint
                    if (boundaryWpIndex >= 0) {
                        const boundaryWp = waypoints[boundaryWpIndex];
                        if (boundaryWp && 
                            Math.abs(boundaryWp.lat - lat) < 0.000001 && 
                            Math.abs(boundaryWp.lon - lon) < 0.000001) {
                            return;
                        }
                    }
                    
                    if (waypoints.length === 0) {
                        waypoints.push({ lat, lon, mode: 'start' });
                    } else {
                        waypoints.push({ lat, lon, mode: 'manual' });
                    }
                });
            }
            
            // Build waypointIndices for this segment
            const startIndex = (segIdx === 0) ? 0 : boundaryWpIndex;
            const endIndex = waypoints.length - 1;
            
            const waypointIndices = [];
            for (let wi = startIndex; wi <= endIndex; wi++) {
                waypointIndices.push(wi);
            }
            
            importedSegments.push({
                mode: segMode,
                startIndex: startIndex,
                endIndex: endIndex,
                waypointIndices: waypointIndices,
                geometry: geometry
            });
        }
        
        if (waypoints.length === 0) {
            return null;
        }
        
        return new Route({
            ...routeAttrs,
            waypoints,
            segments: importedSegments
        });
    }
    
    /**
     * Parse old format GPX (RouteMode at trk level)
     * @private
     */
    _parseOldFormat(trksegs, routeAttrs, oldRouteMode, oldWaypoints) {
        const allTrkpts = [];
        for (const trkseg of Array.from(trksegs)) {
            const trkpts = trkseg.getElementsByTagName('trkpt');
            allTrkpts.push(...Array.from(trkpts));
        }
        
        // Read geometry from trkpt
        const geometry = allTrkpts.map(pt => ({
            lat: parseFloat(pt.getAttribute('lat')),
            lon: parseFloat(pt.getAttribute('lon'))
        }));
        
        const waypoints = [];
        
        if (oldRouteMode === 'manual') {
            // All trkpt are manual waypoints
            allTrkpts.forEach((pt, idx) => {
                waypoints.push({
                    lat: parseFloat(pt.getAttribute('lat')),
                    lon: parseFloat(pt.getAttribute('lon')),
                    mode: idx === 0 ? 'start' : 'manual'
                });
            });
        } else if (oldRouteMode === 'routing') {
            // First trkpt is start, last is end, waypoints from extensions
            if (allTrkpts.length > 0) {
                waypoints.push({
                    lat: parseFloat(allTrkpts[0].getAttribute('lat')),
                    lon: parseFloat(allTrkpts[0].getAttribute('lon')),
                    mode: 'start'
                });
                
                oldWaypoints.forEach(wp => {
                    waypoints.push({ ...wp, mode: 'routing' });
                });
                
                if (allTrkpts.length > 1) {
                    const lastPt = allTrkpts[allTrkpts.length - 1];
                    waypoints.push({
                        lat: parseFloat(lastPt.getAttribute('lat')),
                        lon: parseFloat(lastPt.getAttribute('lon')),
                        mode: 'routing'
                    });
                }
            }
        }
        
        if (waypoints.length === 0) {
            return null;
        }
        
        const waypointIndices = waypoints.map((_, i) => i);
        return new Route({
            ...routeAttrs,
            waypoints,
            segments: [{
                mode: oldRouteMode,
                startIndex: 0,
                endIndex: waypoints.length - 1,
                waypointIndices: waypointIndices,
                geometry: geometry
            }]
        });
    }
    
    /**
     * Parse GPX with no format info (treat as manual)
     * @private
     */
    _parseNoFormat(trksegs, routeAttrs) {
        const geometry = [];
        const waypoints = [];
        
        for (const trkseg of Array.from(trksegs)) {
            const trkpts = trkseg.getElementsByTagName('trkpt');
            Array.from(trkpts).forEach((pt) => {
                const lat = parseFloat(pt.getAttribute('lat'));
                const lon = parseFloat(pt.getAttribute('lon'));
                
                geometry.push({ lat, lon });
                
                if (waypoints.length === 0) {
                    waypoints.push({ lat, lon, mode: 'start' });
                } else {
                    waypoints.push({ lat, lon, mode: 'manual' });
                }
            });
        }
        
        if (waypoints.length === 0) {
            return null;
        }
        
        const waypointIndices = waypoints.map((_, i) => i);
        return new Route({
            ...routeAttrs,
            waypoints,
            segments: [{
                mode: 'manual',
                startIndex: 0,
                endIndex: waypoints.length - 1,
                waypointIndices: waypointIndices,
                geometry: geometry
            }]
        });
    }
    
    // ==================
    // NOT SUPPORTED
    // ==================
    
    async loadRoute(routeId) {
        console.warn('GpxStorage: loadRoute not supported, use loadAll');
        return null;
    }
    
    async saveRoute(route) {
        console.warn('GpxStorage: saveRoute not supported, use saveAll');
        return null;
    }
    
    async deleteRoute(routeId) {
        console.warn('GpxStorage: deleteRoute not supported');
        return false;
    }
}

// Singleton instance
export const gpxStorage = new GpxStorage();


