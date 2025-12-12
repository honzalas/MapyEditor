# MapyEditor Beta - Specifikace

## Přehled

MapyEditor Beta je vylepšená verze editoru tras, která umožňuje **kombinovat routované a ruční segmenty v rámci jedné trasy**. Na rozdíl od původní verze, kde byla trasa buď celá routovaná, nebo celá ruční, nová verze umožňuje libovolně mixovat oba přístupy.

## Datový model

### Waypoint (řídící bod)

Každý waypoint má následující vlastnosti:

```javascript
{
    lat: number,      // zeměpisná šířka
    lon: number,      // zeměpisná délka
    mode: 'start' | 'routing' | 'manual'
}
```

- **start**: První bod trasy, nemá mód (před ním není žádná geometrie)
- **routing**: Geometrie k tomuto bodu se vypočítá přes Mapy.cz Routing API
- **manual**: Geometrie k tomuto bodu je přímá čára

### Segment

Segment je **nepřerušená sekvence waypointů stejného módu**.

| Typ segmentu | Popis | Geometrie |
|--------------|-------|-----------|
| **Manual** | Sekvence manual waypointů | Waypointy samy tvoří geometrii (přímé čáry mezi nimi) |
| **Routing** | Sekvence routing waypointů | Vypočteno z API, waypointy jsou řídící body |

**Omezení routing segmentu:**
- Mapy.cz API podporuje max **15 waypointů** na jedno volání
- Delší routing sekvence se automaticky rozdělí na více segmentů

### Trasa

```javascript
{
    id: number,
    name: string,
    color: 'red' | 'blue' | 'green',
    waypoints: Waypoint[],        // řídící body
    segments: Segment[],          // vypočtené segmenty s geometrií
}
```

## Návaznost geometrie

Klíčové pravidlo: **Geometrie musí být souvislá** (bez skoků).

| Předchozí segment | Aktuální WP mód | Geometrie začíná od |
|-------------------|-----------------|---------------------|
| (žádný - start) | manual | souřadnice Startu |
| (žádný - start) | routing | souřadnice Startu |
| manual | manual | předchozí WP |
| manual | routing | poslední manual WP (= konec předchozí geometrie) |
| routing | manual | **poslední bod routované geometrie** (může být jinde než WP!) |
| routing | routing | **poslední bod routované geometrie** |

> **Důležité:** Routovaná geometrie může končit na silnici, ne přesně na waypointu (kvůli snapování na silniční síť). Proto následující segment vždy začíná od skutečného konce geometrie.

## Příklad trasy

```
Start → WP1(manual) → WP2(manual) → WP3(routing) → WP4(routing) → WP5(manual)
```

Segmenty:
1. **Manual segment**: Start → WP1 → WP2 (geometrie = 3 body spojené přímkami)
2. **Routing segment**: od WP2 přes WP3 do WP4 (geometrie z API)
3. **Manual segment**: od konce routing geometrie → WP5 (přímá čára)

## Uživatelské rozhraní

### Ovládání

| Akce | Výsledek |
|------|----------|
| Klik (bez modifikátoru) | Přidá Start (pouze první bod) |
| **CTRL + klik** | Přidá waypoint s `mode=routing` |
| **ALT + klik** | Přidá waypoint s `mode=manual` |
| Klik na midpoint marker | Přidá waypoint se zděděným módem od segmentu |
| Drag waypointu | Přesune waypoint, přepočítá dotčené segmenty |
| Pravý klik na waypoint | Zobrazí kontextové menu |

### Kontextové menu waypointu

- **Smazat bod** - odstraní waypoint, přepočítá geometrii
- **Rozdělit trasu** - rozdělí trasu na dvě v tomto bodě
- **Změnit na routing** - změní mód na routing (přepočítá segment)
- **Změnit na ruční** - změní mód na manual (přepočítá segment)

### Vizualizace (pouze v editačním módu)

| Prvek | Vzhled |
|-------|--------|
| Routing segment | Plná čára |
| Manual segment | Čárkovaná čára |
| Start marker | Zelený (16px) |
| End marker | Červený (16px) |
| Routing waypoint | Žlutý (14px) |
| Manual waypoint | Bílý (14px) |
| Midpoint marker | Průhledný žlutý (10px) |

## Výpočet geometrie

### Algoritmus přepočtu

Při změně waypointu:
1. Identifikuj segment(y), které waypoint ovlivňuje
2. Pro každý dotčený segment:
   - **Manual**: geometrie = sekvence WP souřadnic
   - **Routing**: zavolej API s příslušnými body
3. Spoj geometrie všech segmentů do souvislé trasy

### Optimalizace API volání

- Routing segmenty se počítají jako jeden API call (až do limitu 15 WP)
- Při změně jednoho WP v routing segmentu se přepočítá celý segment
- Manual segmenty nevyžadují API volání

### Rozdělení dlouhých routing segmentů

Pokud routing sekvence má více než 15 WP:
1. Rozděl na skupiny po max 15 WP
2. Každá skupina = samostatný API call
3. Geometrie se spojí (poslední bod první = první bod druhé)

## GPX formát

### Nový formát (více segmentů)

```xml
<trk>
  <name>Název trasy</name>
  <extensions>
    <gpxx:DisplayColor>red</gpxx:DisplayColor>
  </extensions>
  
  <!-- Routing segment -->
  <trkseg>
    <extensions>
      <gpxx:SegmentMode>routing</gpxx:SegmentMode>
      <gpxx:StartPoint lat="49.123" lon="14.456"/>
      <gpxx:EndPoint lat="49.789" lon="14.012"/>
      <gpxx:Waypoints>
        <gpxx:Waypoint lat="49.456" lon="14.234"/>
      </gpxx:Waypoints>
    </extensions>
    <trkpt lat="49.123" lon="14.456"></trkpt>
    <trkpt lat="49.124" lon="14.457"></trkpt>
    <!-- ... vypočtená geometrie ... -->
    <trkpt lat="49.789" lon="14.012"></trkpt>
  </trkseg>
  
  <!-- Manual segment -->
  <trkseg>
    <extensions>
      <gpxx:SegmentMode>manual</gpxx:SegmentMode>
    </extensions>
    <trkpt lat="49.789" lon="14.012"></trkpt>
    <trkpt lat="49.800" lon="14.020"></trkpt>
    <trkpt lat="49.810" lon="14.030"></trkpt>
  </trkseg>
</trk>
```

### Kompatibilita se starým formátem

**Starý formát `RouteMode=manual`:**
```xml
<trk>
  <extensions>
    <gpxx:RouteMode>manual</gpxx:RouteMode>
  </extensions>
  <trkseg>
    <trkpt>...</trkpt>
  </trkseg>
</trk>
```
→ Všechny `<trkpt>` jsou waypointy s `mode=manual`, první je Start

**Starý formát `RouteMode=routing`:**
```xml
<trk>
  <extensions>
    <gpxx:RouteMode>routing</gpxx:RouteMode>
    <gpxx:Waypoints>
      <gpxx:Waypoint lat="..." lon="..."/>
    </gpxx:Waypoints>
  </extensions>
  <trkseg>
    <trkpt>...</trkpt>
  </trkseg>
</trk>
```
→ První `<trkpt>` = Start, poslední = End (routing), Waypoints z extensions = routing WP, ostatní trkpt = geometrie

## Konfigurace

```javascript
const CONFIG = {
    API_KEY: '...',
    ROUTE_TYPE: 'foot_fast',
    MAX_WAYPOINTS_PER_API_CALL: 15,
    KEYS: {
        ROUTING: 'Control',  // CTRL
        MANUAL: 'Alt'        // ALT
    }
};
```

## Chování při speciálních situacích

### Změna módu waypointu

Když změním WP uprostřed routing sekvence na manual:
- Routing segment se rozdělí
- Vznikne jednobodový manual "segment" (přímá čára k tomuto bodu)
- Následující routing segment začíná od tohoto bodu

### Smazání waypointu

- Přepočítají se dotčené segmenty
- Pokud zbyde méně než 2 body, trasa se smaže

### Rozdělení trasy

- Vytvoří dvě samostatné trasy
- Obě zachovají stejné atributy (název s příponou, barvu)

---

## Dynamický hover marker pro midpointy

Místo statických midpoint markerů na hranách se používá **dynamický hover marker**:

- Kolečko s ikonou plus, které se pohybuje po trase při pohybu myši
- Zobrazuje se pouze v editačním módu aktivní trasy
- Má velikost 24px s bílým pozadím a šedým okrajem
- **Skryje se** pokud je myš blízko existujícího waypointu (< 20px)
- **Zobrazí se** pokud je myš blízko trasy (< 20px)

### Technická implementace

```javascript
// Globální mousemove handler na mapě (ne na jednotlivých polyline!)
map.on('mousemove', (e) => {
    if (!isEditing || !activeRouteId) return;
    updateHoverMarkerPosition(e.latlng);
});
```

> **Důležité:** Handler je na mapě, ne na jednotlivých čárách. To zabraňuje blikání při přechodu mezi segmenty.

### Zděděný mód

Nový waypoint přidaný přes midpoint **zdědí mód** segmentu, do kterého byl vložen.

---

## Sdílené hraniční waypointy

Segmenty **sdílejí hraniční waypointy**:

```
Routing segment: waypointIndices = [0, 1, 2]
Manual segment:  waypointIndices = [2, 3, 4]  // index 2 je sdílený!
```

### Mód hraničního waypointu

Mód hraničního waypointu je určen **předchozím segmentem**:

| Přechod | Hraniční WP mód | Barva markeru |
|---------|-----------------|---------------|
| Routing → Manual | `routing` | Žlutý |
| Manual → Routing | `manual` | Bílý |

---

## Optimalizovaný přepočet geometrie (smartRecalculate)

Funkce `smartRecalculate` minimalizuje API volání tím, že přepočítává **pouze dotčené segmenty**:

### Operace a jejich rozsah přepočtu

| Operace | Přepočítává |
|---------|-------------|
| `move` (waypoint uprostřed manual segmentu) | Nic (lokální změna geometrie) |
| `move` (waypoint na hranici) | Dotčené segmenty + následující |
| `insert` (midpoint) | Segment kde je vloženo + případně následující |
| `append` (nový bod na konec) | Pouze poslední segment |
| `delete`, `modeChange`, `split` | Od změněného segmentu do konce |
| `full` | Celá trasa |

### Příklad optimalizace

```
Trasa: [Routing seg 1] → [Manual seg] → [Routing seg 2]

Operace: Přidání midpointu do Manual segmentu
Přepočet: Pouze Manual segment (bez API volání!)
         Routing segmenty zůstávají nezměněny
```

---

## Napojení segmentů (fixManualToRoutingConnections)

Zajišťuje **souvislou geometrii** bez mezer:

### Problém

- Routing segment končí na silnici (snapnutí)
- Waypoint může být v poli
- Manual segment by začínal od waypointu → mezera

### Řešení

```javascript
function fixManualToRoutingConnections(route) {
    // Pro každý manual segment následující po routing:
    // Poslední bod manual geometrie = první bod následující routing geometrie
}
```

| Přechod | Úprava |
|---------|--------|
| Routing → Manual | Manual začíná od konce routing geometrie (ne od WP) |
| Manual → Routing | Manual končí na začátku routing geometrie |

---

## GPX Import bez API volání

**Geometrie je vždy uložena v GPX** (v `<trkpt>` elementech), takže import nevyžaduje API:

| Formát | Zdroj geometrie | API volání |
|--------|-----------------|------------|
| Nový formát (SegmentMode) | `<trkpt>` | ❌ Ne |
| Starý formát manual | `<trkpt>` | ❌ Ne |
| Starý formát routing | `<trkpt>` | ❌ Ne |
| Bez formátu | `<trkpt>` | ❌ Ne |

### StartsFromPreviousGeometry flag

Pro manual segmenty navazující na routing se ukládá flag:

```xml
<trkseg>
  <extensions>
    <gpxx:SegmentMode>manual</gpxx:SegmentMode>
    <gpxx:StartsFromPreviousGeometry>true</gpxx:StartsFromPreviousGeometry>
  </extensions>
  <trkpt>...</trkpt>  <!-- previousGeometryEnd - NENÍ waypoint -->
  <trkpt>...</trkpt>  <!-- první skutečný waypoint -->
</trkseg>
```

Při importu se první `<trkpt>` přeskočí (je to jen spojovací bod, ne waypoint).

---

## Kurzory myši

| Stav | Kurzor |
|------|--------|
| CTRL stisknuto | `crosshair` (žlutý popisek "routing") |
| ALT stisknuto | `crosshair` (bílý popisek "manual") |
| Myš nad trasou (možnost midpoint) | `pointer` |
| Výchozí | `grab` |

---

## Loading indikátor

- Zobrazuje se **pouze při routing operacích** (API volání)
- Manual operace jsou okamžité, bez indikátoru
- Při importu GPX se nezobrazuje (žádné API volání)

