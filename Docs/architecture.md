# MapyEditor - Architektura aplikace

## Přehled

MapyEditor používá modulární architekturu založenou na vrstvách. Každá vrstva má jasně definovanou odpovědnost a komunikuje s ostatními vrstvami přes definovaná rozhraní.

```
┌─────────────────────────────────────────────────────────┐
│                     index.html                          │
│              (HTML struktura + CSS)                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      app.js                             │
│              (Hlavní vstupní bod)                       │
│         Propojení všech vrstev a orchestrace            │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   UI Layer    │ │ Logic Layer   │ │  Data Layer   │
│    (ui/)      │ │ (services/)   │ │  (models/)    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    Storage Layer      │
              │     (storage/)        │
              └───────────────────────┘
```

---

## Struktura souborů

```
MapyEditor/
├── index.html                    # Hlavní HTML (minimální struktura)
├── css/
│   └── styles.css                # Všechny CSS styly
├── js/
│   ├── config.js                 # Konfigurace a konstanty
│   ├── app.js                    # Hlavní vstupní bod
│   │
│   ├── models/                   # 📦 DATOVÁ VRSTVA
│   │   └── DataStore.js          # Centrální úložiště dat + event emitter
│   │
│   ├── storage/                  # 💾 VRSTVA PERSISTENCE
│   │   ├── StorageInterface.js   # Abstraktní rozhraní
│   │   └── GpxStorage.js         # Implementace pro GPX soubory
│   │
│   ├── services/                 # ⚙️ VRSTVA LOGIKY
│   │   ├── GeometryUtils.js      # Geometrické výpočty
│   │   ├── RoutingService.js     # Komunikace s Mapy.cz API
│   │   └── RouteCalculator.js    # Výpočty segmentů a geometrií
│   │
│   └── ui/                       # 🎨 UI VRSTVA
│       ├── MapManager.js         # Správa Leaflet mapy
│       ├── RouteRenderer.js      # Vykreslování tras
│       ├── ContextMenu.js        # Kontextové menu waypointů
│       ├── RoutesMenu.js         # Menu pro výběr tras v místě
│       ├── HoverMarker.js        # Dynamický midpoint marker
│       └── PanelManager.js       # Správa pravého panelu
│
└── Docs/
    └── architecture.md           # Tento soubor
```

---

## Popis vrstev

### 1. Konfigurační vrstva (`config.js`)

Centralizuje všechny konstanty a nastavení aplikace.

```javascript
export const CONFIG = {
    API_KEY: '...',                    // Mapy.cz API klíč
    ROUTE_TYPE: 'foot_fast',           // Typ routování
    MAX_WAYPOINTS_PER_API_CALL: 15,    // Limit API
    KEYS: { ROUTING: 'Control', MANUAL: 'Alt' },
    MAP: { CENTER: [...], ZOOM: 8 },
    UI: { HOVER_MARKER_DISTANCE_PX: 20 }
};

export const COLOR_MAP = { red: '#D32F2F', ... };
export const MARKER_COLORS = { START: '#4CAF50', ... };
```

**Výhody:**
- Snadná změna konfigurace na jednom místě
- Žádné magic numbers v kódu

---

### 2. Datová vrstva (`models/DataStore.js`)

Centrální úložiště stavu aplikace s event emitterem pro reaktivní aktualizace.

#### Hlavní třídy

**Route** - Model trasy
```javascript
class Route {
    id: number
    name: string
    color: string
    waypoints: Array<{lat, lon, mode}>
    segments: Array<{mode, geometry, waypointIndices}>
    
    // Virtualizované zobrazovací metody
    getTitle()      // Vrací zobrazitelný název trasy
    getSubtitle()   // Vrací dodatečné info (počet bodů)
    getColor()      // Vrací hex barvu (#D32F2F, #1976D2, #388E3C)
    
    clone()         // Hluboká kopie pro backup
    toJSON()        // Serializace
}
```

> **Poznámka:** Metody `getTitle()`, `getSubtitle()` a `getColor()` centralizují logiku zobrazení a používají se ve všech UI komponentách pro konzistenci.

**DataStore** - Singleton správce stavu
```javascript
class DataStore extends EventEmitter {
    // Stav
    routes: Route[]
    activeRouteId: number | null
    isEditing: boolean
    routeBackup: Route | null
    ctrlPressed: boolean
    altPressed: boolean
    
    // Metody
    createRoute(name, color): Route
    addRoute(routeData): Route
    updateRoute(id, updates): Route
    deleteRoute(id): boolean
    activateRoute(id): boolean
    deactivateRoute(): void
    cancelEditing(): void
    
    // Eventy
    'route:created', 'route:added', 'route:deleted'
    'route:activated', 'route:deactivated'
    'routes:loaded', 'search:changed'
}
```

**Použití eventů:**
```javascript
dataStore.on('route:updated', (route) => {
    routeRenderer.render(route);
});
```

---

### 3. Storage vrstva (`storage/`)

Abstrakce pro persistenci dat. Umožňuje snadnou záměnu implementace.

#### StorageInterface (abstraktní)
```javascript
class StorageInterface {
    async loadAll(options): Promise<Route[]>
    async saveAll(routes): Promise<boolean>
    async loadRoute(id): Promise<Route | null>
    async saveRoute(route): Promise<Route | null>
    async deleteRoute(id): Promise<boolean>
    supportsIndividualOperations(): boolean
    getType(): string
}
```

#### GpxStorage (implementace)
```javascript
class GpxStorage extends StorageInterface {
    // Export
    async saveAll(routes) {
        // Generuje GPX XML a spustí download
    }
    
    // Import
    async loadAll(files) {
        // Parsuje GPX soubory, vrací Route[]
        // Podporuje nový i starý formát
    }
    
    // Nepodporované operace (GPX je souborový formát)
    loadRoute() → null
    saveRoute() → null
    deleteRoute() → false
}
```

#### Budoucí ApiStorage
```javascript
class ApiStorage extends StorageInterface {
    async loadAll() { /* GET /api/routes */ }
    async loadRoute(id) { /* GET /api/routes/:id */ }
    async saveRoute(route) { /* PUT /api/routes/:id */ }
    async deleteRoute(id) { /* DELETE /api/routes/:id */ }
    supportsIndividualOperations() { return true; }
}
```

---

### 4. Logická vrstva (`services/`)

Obsahuje business logiku bez závislosti na UI.

#### GeometryUtils.js
```javascript
// Geometrické výpočty
projectPointOnSegment(point, p1, p2)
distanceSquared(p1, p2)
findClosestPointOnPolyline(latlng, geometry)
findClosestPointOnGeometry(latlng, segment, waypoints)
findWaypointGeometryIndices(segment, waypoints)
pointsEqual(p1, p2, tolerance)

// Detekce tras v bodě
findRoutesAtPoint(latlng, routes, maxDistancePixels, map)
// Vrací: [{route, distance, pixelDistance}]
```

#### RoutingService.js
```javascript
class RoutingService {
    setLoadingCallback(callback)    // Pro UI indikátor
    
    async calculateRoute(start, end, waypoints): Promise<coords[]>
    async calculateRoutingSegment(waypoints, indices, prevGeomEnd)
}
```

#### RouteCalculator.js
```javascript
class RouteCalculator {
    // Analýza segmentů
    analyzeSegments(waypoints): SegmentDef[]
    
    // Výpočet geometrie
    calculateManualSegment(waypoints, indices, prevGeomEnd)
    async calculateSegmentGeometry(route, segment, prevGeomEnd)
    
    // Optimalizovaný přepočet
    async smartRecalculate(route, options)
    // options.operation: 'move' | 'insert' | 'append' | 'delete' | 'full'
    
    // Oprava spojů
    fixManualToRoutingConnections(route)
}
```

**Klíčový koncept - smartRecalculate:**
- Analyzuje změny a přepočítá pouze dotčené segmenty
- Šetří API volání
- Zachovává geometrii nezměněných segmentů

---

### 5. UI vrstva (`ui/`)

Komponenty pro vizualizaci a interakci.

#### MapManager.js
```javascript
class MapManager {
    initialize(containerId)     // Vytvoří Leaflet mapu
    setCursorMode(mode)         // 'add-routing-mode', 'add-manual-mode', ...
    fitBounds(coordinates)      // Zoom na oblast
    
    // Správa vrstev
    setRouteLayers(routeId, layers)
    getRouteLayers(routeId)
    removeRouteLayers(routeId)
    
    // Event delegace
    on(event, handler)
    off(event, handler)
}
```

#### RouteRenderer.js
```javascript
class RouteRenderer {
    // Callbacky pro interakce
    setRouteClickCallback(callback)
    setRouteHoverCallback(callback)
    setMarkerDragEndCallback(callback)
    setMarkerContextMenuCallback(callback)
    
    // Vykreslování
    render(route, isActive, isEditing)
    renderAll(routes, activeRouteId, isEditing)
    highlightRoute(routeId, highlight)
}
```

#### ContextMenu.js
```javascript
class ContextMenu {
    initialize()
    show(x, y, data)
    hide()
    
    setDeleteCallback(callback)
    setSplitCallback(callback)
    setModeChangeCallback(callback)
}
```

#### RoutesMenu.js
```javascript
class RoutesMenu {
    initialize()
    show(x, y, routeResults)  // routeResults = [{route, distance, pixelDistance}]
    hide()
    isVisible()
    
    setRouteSelectCallback(callback)
}
```

**Použití:**
- Zobrazí se při pravém kliku na mapu (mimo edit mód)
- Najde všechny trasy v dosahu 20px od kurzoru
- Zobrazí seznam s použitím `route.getTitle()`, `route.getSubtitle()`, `route.getColor()`
- Klik na trasu ji aktivuje pro editaci

#### HoverMarker.js
```javascript
class HoverMarker {
    setClickCallback(callback)
    show(lat, lon, data)
    hide()
    updatePosition(latlng, route, isEditing)
}
```

#### PanelManager.js
```javascript
class PanelManager {
    initialize()
    
    // UI aktualizace
    setStatusText(text)
    showLoading() / hideLoading()
    updateUI(state)
    updateRoutesList(routes, filteredRoutes)
    showImportPanel() / hideImportPanel()
    
    // Callbacky pro všechny interakce
    setRouteClickCallback(callback)
    setNameChangeCallback(callback)
    setSaveCallback(callback)
    // ... atd.
}
```

---

### 6. Hlavní aplikace (`app.js`)

Orchestruje všechny vrstvy a definuje flow aplikace.

```javascript
class App {
    constructor() {
        this._storage = gpxStorage;
    }
    
    async initialize() {
        // 1. Inicializace UI komponent
        mapManager.initialize('map');
        contextMenu.initialize();
        panelManager.initialize();
        
        // 2. Propojení callbacků
        this._setupRoutingServiceCallbacks();
        this._setupRendererCallbacks();
        this._setupContextMenuCallbacks();
        this._setupRoutesMenuCallbacks();
        this._setupHoverMarkerCallbacks();
        this._setupPanelCallbacks();
        this._setupMapEventHandlers();
        this._setupKeyboardHandlers();
        this._setupDataStoreEventListeners();
        
        // 3. Počáteční UI stav
        this._updateUI();
    }
    
    // Operace s trasami
    _createNewRoute()
    _activateRouteWithBestFit(routeId)
    _saveRoute()
    _cancelEditing()
    _deleteCurrentRoute()
    _deleteWaypoint(index)
    _splitRoute(index)
    _changeWaypointMode(index, newMode)
    _insertMidpoint(data)
    _handleMapClick(e)
    
    // Import/Export
    _importFiles(files)
    _exportRoutes()
    
    // UI aktualizace
    _updateUI()
    _updateRoutesList()
    _updateCursor()
}
```

---

## Komunikace mezi vrstvami

### Data Flow

```
User Action (klik na mapu)
    │
    ▼
┌─────────────┐
│   app.js    │  ← Zachytí event z MapManager
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  DataStore      │  ← Aktualizuje waypoints
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ RouteCalculator │  ← Přepočítá geometrii
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ RouteRenderer   │  ← Překreslí trasu
└─────────────────┘
```

### Event Flow

```
DataStore.emit('route:updated')
    │
    ├──► RouteRenderer.render()
    │
    └──► PanelManager.updateUI()
```

### Routes Menu Flow

```
User: Pravý klik na mapu (mimo edit mód)
    │
    ▼
┌─────────────┐
│   app.js    │  ← Map 'contextmenu' event
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ GeometryUtils   │  ← findRoutesAtPoint(latlng, routes, 20px, map)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  RoutesMenu     │  ← show(x, y, routeResults)
└──────┬──────────┘  │  Zobrazí seznam tras s:
       │             │  - route.getTitle()
       │             │  - route.getSubtitle()
       │             │  - route.getColor()
       ▼
    User klikne na trasu
       │
       ▼
┌─────────────┐
│   app.js    │  ← _activateRouteWithBestFit(routeId)
└─────────────┘
```

---

## Singleton Pattern

Většina služeb používá singleton pattern pro snadný přístup:

```javascript
// V modulu
class MyService { ... }
export const myService = new MyService();

// Použití
import { myService } from './services/MyService.js';
myService.doSomething();
```

---

## Rozšiřitelnost

### Přidání nového storage (REST API)

1. Vytvořit `js/storage/ApiStorage.js`:
```javascript
import { StorageInterface } from './StorageInterface.js';

export class ApiStorage extends StorageInterface {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
    }
    
    async loadAll() {
        const response = await fetch(`${this.baseUrl}/routes`);
        return response.json();
    }
    
    // ... implementace dalších metod
}
```

2. V `app.js` změnit storage:
```javascript
import { apiStorage } from './storage/ApiStorage.js';

class App {
    constructor() {
        this._storage = apiStorage;  // Místo gpxStorage
    }
}
```

### Přidání nové mapové knihovny

1. Vytvořit `js/ui/MapboxManager.js` implementující stejné rozhraní jako `MapManager`
2. V `app.js` změnit import

---

## Testování

Díky oddělení vrstev lze snadno testovat:

```javascript
// Unit test pro RouteCalculator
import { routeCalculator } from './services/RouteCalculator.js';

test('analyzeSegments creates correct segments', () => {
    const waypoints = [
        { lat: 0, lon: 0, mode: 'start' },
        { lat: 1, lon: 1, mode: 'routing' },
        { lat: 2, lon: 2, mode: 'manual' }
    ];
    
    const segments = routeCalculator.analyzeSegments(waypoints);
    
    expect(segments).toHaveLength(2);
    expect(segments[0].mode).toBe('routing');
    expect(segments[1].mode).toBe('manual');
});
```

---

## Závěr

Tato architektura poskytuje:

| Vlastnost | Výhoda |
|-----------|--------|
| **Separace zodpovědností** | Každý modul má jasný účel |
| **Testovatelnost** | Logiku lze testovat bez UI |
| **Rozšiřitelnost** | Snadné přidání nových funkcí |
| **Zaměnitelnost** | Storage, mapa lze vyměnit |
| **Čitelnost** | Malé, přehledné soubory |
| **Týmová práce** | Různí lidé mohou pracovat na různých vrstvách |


