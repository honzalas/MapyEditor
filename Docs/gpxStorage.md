# GPX Storage – Specifikace formátu

Tento dokument popisuje strukturu GPX souborů používaných aplikací MapyEditor pro ukládání a načítání tras.

## Přehled

MapyEditor používá standardní GPX 1.1 formát rozšířený o vlastní namespace `mapy:` pro ukládání atributů tras.

## XML Struktura

### Kořenový element

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" 
     creator="MapyEditorBeta" 
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"
     xmlns:mapy="http://mapyeditor.local/gpx/1">
```

### Trasa (trk element)

Každá trasa je uložena jako `<trk>` element:

```xml
<trk>
    <name>Název trasy</name>
    <extensions>
        <!-- Atributy trasy -->
        <mapy:routeType>Hiking</mapy:routeType>
        <mapy:color>Red</mapy:color>
        <mapy:ref>0001</mapy:ref>
        <mapy:name>Název trasy</mapy:name>
        <mapy:symbol>Červená značka</mapy:symbol>
        <mapy:network>Nwn</mapy:network>
        <mapy:wikidata>Q12345</mapy:wikidata>
        <mapy:customData>Poznámky...</mapy:customData>
    </extensions>
    <trkseg>
        <!-- Segmenty trasy -->
    </trkseg>
</trk>
```

## Atributy tras

### Povinné atributy

| Atribut | Element | Typ | Hodnoty | Default |
|---------|---------|-----|---------|---------|
| Typ trasy | `mapy:routeType` | enum | `Hiking`, `Foot`, `FitnessTrail`, `ViaFerrata` | `Hiking` |

### Volitelné atributy

| Atribut | Element | Typ | Popis |
|---------|---------|-----|-------|
| Barva | `mapy:color` | enum | Barva trasy na mapě |
| Vlastní barva | `mapy:customColor` | string | HEX hodnota (pouze při `color=Other`) |
| Značka | `mapy:symbol` | string | Textový popis značení trasy |
| Název | `mapy:name` | string | Název trasy |
| Číslo/zkratka | `mapy:ref` | string | Referenční číslo nebo zkratka |
| Rozsah | `mapy:network` | enum | Rozsah/úroveň trasy |
| Wikidata | `mapy:wikidata` | string | Wikidata ID (např. Q12345) |
| Vlastní data | `mapy:customData` | string | Cokoliv dalšího, volný text na další atributy |



### Poznámky k atributům

- Atributy s hodnotou `null` nebo prázdnou se do GPX neukládají
- Element `<name>` na úrovni `<trk>` slouží pro kompatibilitu se standardním GPX
- Pokud `mapy:name` není vyplněno, použije se hodnota z `<name>`

## Segmenty (trkseg)

Každý segment obsahuje informace o způsobu vytvoření a geometrii:

```xml
<trkseg>
    <extensions>
        <gpxx:SegmentMode>routing</gpxx:SegmentMode>
        <gpxx:StartPoint lat="50.123" lon="14.456"/>
        <gpxx:EndPoint lat="50.234" lon="14.567"/>
        <gpxx:Waypoints>
            <gpxx:Waypoint lat="50.150" lon="14.500"/>
        </gpxx:Waypoints>
    </extensions>
    <trkpt lat="50.123" lon="14.456"></trkpt>
    <trkpt lat="50.130" lon="14.470"></trkpt>
    <!-- další body geometrie -->
</trkseg>
```

### SegmentMode hodnoty

| Hodnota | Popis |
|---------|-------|
| `routing` | Segment vypočítaný pomocí routovacího API. Krom vlastní geometrie jsou v extensions uloženy řídící body pro routování - StartPoint,EndPoint a Waypoints. |
| `manual` | Ručně zadané body (přímé úsečky). Uložená je pouze geometrie, řídící body nemají smysl. Pozor, okrajové body musí navazovat na geometrie okolních úseků.  |

## Poznámky (wpt elementy)

Poznámky se ukládají jako standardní GPX waypoints (`<wpt>`) s textem v elementu `<desc>`:

```xml
<wpt lat="50.0755" lon="14.4378">
    <desc>Poznámka k tomuto místu</desc>
</wpt>
```

### Struktura poznámky

| Element | Popis | Povinné |
|---------|-------|---------|
| `<wpt>` | Waypoint element s atributy `lat` a `lon` | Ano |
| `<desc>` | Text poznámky | Ne (může být prázdný) |

**Poznámky:**
- Element `<name>` se nepoužívá (pouze `<desc>`)
- Text v `<desc>` může obsahovat entery (odřádkování)
- Speciální znaky v textu se automaticky escapují (XML entity)
- Poznámky jsou nezávislé na trasách a mohou být prázdné

## Příklad kompletního GPX

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapyEditorBeta" 
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"
     xmlns:mapy="http://mapyeditor.local/gpx/1">
  <trk>
    <name>Turistická trasa Praha</name>
    <extensions>
      <mapy:routeType>Hiking</mapy:routeType>
      <mapy:color>Red</mapy:color>
      <mapy:name>Turistická trasa Praha</mapy:name>
      <mapy:ref>0001</mapy:ref>
      <mapy:symbol>Červená značka</mapy:symbol>
      <mapy:network>Nwn</mapy:network>
    </extensions>
    <trkseg>
      <extensions>
        <gpxx:SegmentMode>routing</gpxx:SegmentMode>
        <gpxx:StartPoint lat="50.0755" lon="14.4378"/>
        <gpxx:EndPoint lat="50.0880" lon="14.4200"/>
      </extensions>
      <trkpt lat="50.0755" lon="14.4378"></trkpt>
      <trkpt lat="50.0800" lon="14.4300"></trkpt>
      <trkpt lat="50.0880" lon="14.4200"></trkpt>
    </trkseg>
  </trk>
  <wpt lat="50.0755" lon="14.4378">
    <desc>Důležité místo na trase</desc>
  </wpt>
  <wpt lat="50.0820" lon="14.4450">
    <desc>Rozcestník</desc>
  </wpt>
</gpx>
```

## Implementace

Viz [architecture.md](architecture.md) sekce `GpxStorage.js` pro detaily implementace.
