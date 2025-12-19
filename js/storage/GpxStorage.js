/**
 * MapyEditor - GPX Storage
 * Implementation of StorageInterface for GPX file format
 * 
 * Updated for independent segments - each segment has its own waypoints
 * See Docs/gpxStorage.md for GPX format specification
 */

import { StorageInterface } from './StorageInterface.js';
import { Route, Segment } from '../models/DataStore.js';
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
        // Filter routes with at least one valid segment
        const validRoutes = routes.filter(r => r.hasValidSegments());
        
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
            
            // Export each valid segment as a trkseg
            for (const segment of route.segments) {
                if (!segment.isValid()) continue;
                
                gpx += '    <trkseg>\n';
                gpx += '      <extensions>\n';
                gpx += `        <gpxx:SegmentMode>${segment.mode}</gpxx:SegmentMode>\n`;
                
                if (segment.mode === 'routing') {
                    // Save waypoints (control points) for routing segments
                    const startWp = segment.waypoints[0];
                    const endWp = segment.waypoints[segment.waypoints.length - 1];
                    gpx += `        <gpxx:StartPoint lat="${startWp.lat}" lon="${startWp.lon}"/>\n`;
                    gpx += `        <gpxx:EndPoint lat="${endWp.lat}" lon="${endWp.lon}"/>\n`;
                    
                    // Middle waypoints (via points)
                    if (segment.waypoints.length > 2) {
                        gpx += '        <gpxx:Waypoints>\n';
                        for (let i = 1; i < segment.waypoints.length - 1; i++) {
                            const wp = segment.waypoints[i];
                            gpx += `          <gpxx:Waypoint lat="${wp.lat}" lon="${wp.lon}"/>\n`;
                        }
                        gpx += '        </gpxx:Waypoints>\n';
                    }
                }
                
                gpx += '      </extensions>\n';
                
                // Geometry points (trkpt)
                segment.geometry.forEach(coord => {
                    gpx += `      <trkpt lat="${coord.lat}" lon="${coord.lon}"></trkpt>\n`;
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
            
            // Check for old format RouteMode (single mode for whole route)
            const routeModeEl = trkExtensions.getElementsByTagName('gpxx:RouteMode')[0] || 
                               trkExtensions.getElementsByTagName('RouteMode')[0];
            if (routeModeEl) {
                oldRouteMode = routeModeEl.textContent.toLowerCase();
            }
            
            // Check for old format Waypoints (for whole route)
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
        
        // Check if format uses SegmentMode (for segment parsing)
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
        
        let segments;
        if (hasSegmentMode) {
            segments = this._parseNewFormat(trksegs);
        } else if (oldRouteMode) {
            segments = this._parseOldFormat(trksegs, oldRouteMode, oldWaypoints);
        } else {
            segments = this._parseNoFormat(trksegs);
        }
        
        if (segments.length === 0) {
            return null;
        }
        
        return new Route({
            ...routeAttrs,
            segments
        });
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
     * Each trkseg becomes an independent segment
     * @private
     */
    _parseNewFormat(trksegs) {
        const segments = [];
        
        for (const trkseg of Array.from(trksegs)) {
            const segExt = trkseg.getElementsByTagName('extensions')[0];
            
            let segMode = 'manual';
            let segWaypoints = [];
            
            if (segExt) {
                const segModeEl = segExt.getElementsByTagName('gpxx:SegmentMode')[0] || 
                                 segExt.getElementsByTagName('SegmentMode')[0];
                if (segModeEl) {
                    segMode = segModeEl.textContent.toLowerCase();
                }
                
                if (segMode === 'routing') {
                    // Read waypoints from extensions
                    const startEl = segExt.getElementsByTagName('gpxx:StartPoint')[0] || 
                                   segExt.getElementsByTagName('StartPoint')[0];
                    if (startEl) {
                        segWaypoints.push({
                            lat: parseFloat(startEl.getAttribute('lat')),
                            lon: parseFloat(startEl.getAttribute('lon'))
                        });
                    }
                    
                    // Via waypoints
                    const wpContainer = segExt.getElementsByTagName('gpxx:Waypoints')[0] || 
                                       segExt.getElementsByTagName('Waypoints')[0];
                    if (wpContainer) {
                        const wpEls = wpContainer.getElementsByTagName('gpxx:Waypoint');
                        const wpEls2 = wpContainer.getElementsByTagName('Waypoint');
                        const wpArray = wpEls.length > 0 ? wpEls : wpEls2;
                        Array.from(wpArray).forEach(el => {
                            segWaypoints.push({
                                lat: parseFloat(el.getAttribute('lat')),
                                lon: parseFloat(el.getAttribute('lon'))
                            });
                        });
                    }
                    
                    const endEl = segExt.getElementsByTagName('gpxx:EndPoint')[0] || 
                                 segExt.getElementsByTagName('EndPoint')[0];
                    if (endEl) {
                        segWaypoints.push({
                            lat: parseFloat(endEl.getAttribute('lat')),
                            lon: parseFloat(endEl.getAttribute('lon'))
                        });
                    }
                }
            }
            
            // Read geometry from trkpt
            const trkpts = trkseg.getElementsByTagName('trkpt');
            const geometry = Array.from(trkpts).map(pt => ({
                lat: parseFloat(pt.getAttribute('lat')),
                lon: parseFloat(pt.getAttribute('lon'))
            }));
            
            // For manual segments, waypoints = geometry
            if (segMode === 'manual' || segWaypoints.length === 0) {
                segWaypoints = geometry.map(g => ({ lat: g.lat, lon: g.lon }));
                segMode = 'manual';
            }
            
            if (segWaypoints.length >= 2) {
                segments.push(new Segment({
                    mode: segMode,
                    waypoints: segWaypoints,
                    geometry: geometry
                }));
            }
        }
        
        return segments;
    }
    
    /**
     * Parse old format GPX (RouteMode at trk level)
     * Creates a single segment with the specified mode
     * @private
     */
    _parseOldFormat(trksegs, oldRouteMode, oldWaypoints) {
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
        
        let waypoints = [];
        
        if (oldRouteMode === 'manual') {
            // All trkpt are waypoints
            waypoints = geometry.map(g => ({ lat: g.lat, lon: g.lon }));
        } else if (oldRouteMode === 'routing') {
            // First and last trkpt + waypoints from extensions
            if (allTrkpts.length > 0) {
                waypoints.push({
                    lat: parseFloat(allTrkpts[0].getAttribute('lat')),
                    lon: parseFloat(allTrkpts[0].getAttribute('lon'))
                });
                
                oldWaypoints.forEach(wp => {
                    waypoints.push({ lat: wp.lat, lon: wp.lon });
                });
                
                if (allTrkpts.length > 1) {
                    const lastPt = allTrkpts[allTrkpts.length - 1];
                    waypoints.push({
                        lat: parseFloat(lastPt.getAttribute('lat')),
                        lon: parseFloat(lastPt.getAttribute('lon'))
                    });
                }
            }
        }
        
        if (waypoints.length < 2) {
            return [];
        }
        
        return [new Segment({
            mode: oldRouteMode,
            waypoints: waypoints,
            geometry: geometry
        })];
    }
    
    /**
     * Parse GPX with no format info (treat as manual)
     * Each trkseg becomes a manual segment
     * @private
     */
    _parseNoFormat(trksegs) {
        const segments = [];
        
        for (const trkseg of Array.from(trksegs)) {
            const trkpts = trkseg.getElementsByTagName('trkpt');
            const waypoints = Array.from(trkpts).map(pt => ({
                lat: parseFloat(pt.getAttribute('lat')),
                lon: parseFloat(pt.getAttribute('lon'))
            }));
            
            if (waypoints.length >= 2) {
                segments.push(new Segment({
                    mode: 'manual',
                    waypoints: waypoints,
                    geometry: waypoints.map(wp => ({ lat: wp.lat, lon: wp.lon }))
                }));
            }
        }
        
        return segments;
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
