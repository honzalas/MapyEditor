# MapyEditor Beta - Dokumentace uživatelského rozhraní

## Přehled

MapyEditor Beta je editor tras, který umožňuje vytvářet a upravovat trasy složené z **nezávislých segmentů**. Každý segment má svůj vlastní start a cíl, může být buď **plánovaný** (routing) nebo **ruční** (manual), a může být editován nezávisle na ostatních segmentech trasy.

## Datový model

### Segment

Segment je **nezávislá část trasy** s vlastními waypointy a geometrií:

```javascript
{
    mode: 'routing' | 'manual',  // Typ segmentu
    waypoints: [{lat, lon}, ...], // Řídící body segmentu
    geometry: [{lat, lon}, ...]   // Vypočtená geometrie (čára na mapě)
}
```

**Typy segmentů:**
- **Routing (plánovaný)**: Geometrie se vypočítá přes Mapy.cz Routing API. Waypointy jsou řídící body, které se "snapují" na silniční síť. Maximálně 15 waypointů.
- **Manual (ruční)**: Geometrie jsou přímé čáry mezi waypointy. Žádné omezení počtu bodů.

**Validita segmentu:**
- Segment musí mít **minimálně 2 waypointy** (start + cíl)
- Nevalidní segmenty (méně než 2 body) se automaticky zahazují při:
  - Uložení trasy
  - Přepnutí na jiný segment
  - Přidání nového segmentu

### Trasa

Trasa obsahuje atributy a pole segmentů:

```javascript
{
    id: number,
    
    // Atributy trasy (společné pro všechny segmenty)
    routeType: 'Hiking' | 'Foot' | 'FitnessTrail' | 'ViaFerrata',
    color: 'Red' | 'Blue' | 'Green' | ... | 'Other' | null,
    customColor: string | null,
    symbol: string | null,
    name: string | null,
    ref: string | null,
    network: 'Iwn' | 'Nwn' | 'Lwn',
    wikidata: string | null,
    customData: string | null,
    
    // Segmenty
    segments: Segment[]  // Pole nezávislých segmentů
}
```

**Důležité:**
- Segmenty **nenavazují** na sebe - každý má vlastní start a cíl
- Atributy jsou **společné** pro celou trasu
- Trasa musí mít **alespoň jeden validní segment** (≥2 waypointy)

## Hlavní komponenty UI

### 1. Mapa

Centrální komponenta pro zobrazení a interakci s trasami:
- Zobrazuje všechny trasy a jejich segmenty
- Umožňuje klikání pro přidávání bodů
- Zobrazuje hover efekty a tooltips
- Podporuje drag & drop waypointů

### 2. Pravý panel

Obsahuje čtyři hlavní sekce (zobrazuje se vždy jen jedna podle aktuálního režimu):

#### A) Hlavní toolbar
- **Nová** - vytvoří novou trasu s prázdným segmentem
- **Nahrát** - import GPX souborů
- **Uložit** - export všech tras do GPX

#### B) Seznam tras (běžný režim)
- Zobrazuje všechny načtené trasy
- Vyhledávání tras
- Kliknutím otevře detail trasy
- Hover zvýrazní trasu na mapě

#### C) Panel detailu trasy (režim zobrazení detailu)
- **Hlavička**:
  - **Tlačítko zpět** (vlevo) - šipka doleva, vrací na seznam tras
  - **Nadpis "Detail trasy"** (uprostřed)
  - **Menu tlačítko** (vpravo) - tři tečky, obsahuje "Kopírovat trasu" a "Smazat trasu"
- **Tlačítko "Editovat trasu"** - přepne do editačního režimu
- **Scrollovatelný obsah** (pouze pro čtení):
  - Atributy trasy (zobrazení hodnot)
  - Seznam segmentů (statický, bez možnosti editace)

**Layout hlavičky:**
- Tlačítko zpět má **pevnou šířku** (ne roztahuje se), je umístěno vlevo
- Nadpis je uprostřed (flex: 1)
- Menu tlačítko je vpravo
- Všechny prvky jsou na jednom řádku pomocí flexbox layoutu

#### D) Panel editace (editační režim)
- **Hlavička**: Tlačítka "Uložit trasu" a "Storno" (menu trasy bylo přesunuto do detail panelu)
- **Scrollovatelný obsah**:
  - Formulář atributů trasy
  - Seznam segmentů s možností přidání/úpravy

## Režimy práce

### Běžný pohled (non-editing mode)

**Vizuální stav:**
- Všechny trasy jsou zobrazeny na mapě
- Trasy jsou vykresleny jako plné čáry svojí barvou (atribut)
- Barva odpovídá atributu `color` trasy
- Hover nad trasou ji zvýrazní (tlustší čára, vyšší opacity) a zobrazí tooltip s názve

**Interakce:**
- **Klik na trasu**: 
  - Pokud je v místě jen jedna trasa → otevře detail trasy
  - Pokud je více tras → zobrazí menu s výběrem
- **Pravý klik na mapu**: Zobrazí menu se všemi trasami v místě (pokud existují)
- **Hover nad trasou**: Zvýrazní trasu na mapě

### Režim detailu trasy (detail viewing mode)

**Vizuální stav:**
- Aktivní trasa je zvýrazněna na mapě (tlustší čára)
- Ostatní trasy zůstávají zobrazeny a jsou **kliknutelné** (otevřou svůj detail)
- Panel zobrazuje read-only informace o trase

**Interakce:**
- **Klik na jinou trasu** (mapa nebo seznam): Otevře detail této trasy
- **Tlačítko zpět** nebo **ESC**: Vrátí na seznam tras
- **Tlačítko "Editovat trasu"**: Přepne do editačního režimu
- **Menu (tři tečky)**:
  - **Kopírovat trasu**: Vytvoří kopii a otevře detail nové kopie
  - **Smazat trasu**: Smaže trasu a vrátí na seznam tras

**Panel detailu:**
- **Hlavička**:
  - Tlačítko zpět (vlevo) - ikona šipky doleva, pevná šířka, ne roztahuje se
  - Nadpis "Detail trasy" (uprostřed)
  - Menu tlačítko (vpravo) - tři tečky
- **Obsah**:
  - Atributy trasy (read-only zobrazení)
  - Nadpis "Segmenty" - stylovaný šedou barvou (`#9e9e9e`), uppercase, s letter-spacing
  - Seznam segmentů (statický, bez možnosti editace)

**Přechody:**
- Seznam tras → Klik na trasu → Detail trasy
- Detail trasy → "Editovat trasu" → Editační režim
- Detail trasy → Zpět/ESC → Seznam tras
- Detail trasy → Smazat → Seznam tras
- Detail trasy → Kopírovat → Detail trasy (nové kopie)

### Editační režim (editing mode)

**Vizuální stav:**
- **Aktivní segment** (právě editovaný):
  - Barevné waypoint markery (zelený start, červený konec, žluté/bledě modré průjezdní)
  - Markery jsou draggable
  - Hover marker pro přidávání midpoints (zelený kruh s +)
  
- **Neaktivní segmenty** (ostatní segmenty editované trasy):
  - Malé šedé markery na startu a konci (10px, neinteraktivní)
  - Slouží pouze pro vizuální orientaci
  - Kliknutím na čáru nebo marker se segment aktivuje

- **Ostatní trasy** (needitované):
  - Zobrazeny normálně, ale bez interakce

**Z-ordering:**
- Aktivní segment je vždy vykreslen **nad** ostatními segmenty
- Zajišťuje správnou editaci i při překrývání

## Vytváření a editace tras

### Vytvoření nové trasy

1. Klik na tlačítko **"Nová"** v hlavním toolbaru
2. Vytvoří se nová trasa s **jedním prázdným segmentem** (0 waypointů)
3. Aplikace přejde do editačního režimu
4. **Kurzor se změní na crosshair** (režim přidávání startu)

### Přidávání waypointů

#### Start (první bod segmentu)

- **Akce**: Klik na mapu (bez modifikátoru)
- **Výsledek**: Vytvoří se start waypoint (zelený marker)
- **Kurzor**: `crosshair`
- **Poznámka**: Funguje pouze pokud segment má 0 waypointů

#### Průjezdní body (routing segment)

- **Akce**: **CTRL + klik** na mapu
- **Výsledek**: Přidá se routing waypoint (žlutý marker)
- **Kurzor**: `crosshair` (sjednocený s režimem startu)
- **Omezení**: Maximálně 15 waypointů v routing segmentu

#### Midpointy (průjezdní body na čáře)

- **Akce**: Klik na **hover marker** (zelený kruh s +), který se zobrazí při pohybu myši nad čárou aktivního segmentu
- **Výsledek**: Přidá se waypoint na pozici markeru
- **Mód**: Zdědí mód segmentu (routing nebo manual)
- **Podmínky zobrazení**:
  - Zobrazí se pouze pokud je myš blízko čáry (< 20px)
  - Skryje se pokud je myš blízko existujícího waypointu (< 20px)

### Editace waypointů

#### Přesunutí waypointu

- **Akce**: Drag & drop waypoint markeru
- **Výsledek**: 
  - Waypoint se přesune na novou pozici
  - Geometrie segmentu se přepočítá
  - Pro routing segmenty se zavolá API

#### Smazání waypointu

- **Akce**: Pravý klik na waypoint → "Smazat bod"
- **Výsledek**: 
  - Waypoint se odstraní
  - Pokud by segment měl <2 body, zobrazí se dotaz na smazání celého segmentu
  - Geometrie se přepočítá

### Změna módu segmentu

#### Z routing na manual

- **Akce**: 
  - Pravý klik na waypoint → "Změnit segment na ruční"
  - Nebo v seznamu segmentů → menu → "Změnit na ruční"
- **Výsledek**: 
  - Všechny waypointy segmentu se změní na manual mód
  - Geometrie se nahradí přímkami mezi waypointy

#### Z manual na routing

- **Akce**: 
  - Pravý klik na waypoint → "Změnit segment na plánování"
  - Nebo v seznamu segmentů → menu → "Změnit na plánování"
- **Omezení**: Možné pouze pokud segment má **≤15 waypointů**
- **Výsledek**: 
  - Všechny waypointy segmentu se změní na routing mód
  - Geometrie se přepočítá přes API

## Práce se segmenty

### Seznam segmentů

V editačním panelu, pod formulářem atributů, je sekce **"Segmenty"**:

```
┌─────────────────────────────┐
│ Segmenty          [+ Nový] │
├─────────────────────────────┤
│ 1. Plánovaný (5 bodů)  [⋮] │ ← Aktivní (zvýrazněný)
│ 2. Ruční (3 body)      [⋮] │
│ 3. Plánovaný (8 bodů)  [⋮] │
└─────────────────────────────┘
```

**Každý řádek zobrazuje:**
- Pořadové číslo segmentu
- Typ segmentu (Plánovaný / Ruční)
- Počet waypointů
- Menu tlačítko (⋮) pro akce

### Aktivace segmentu

Segment se aktivuje (přepne do editace) třemi způsoby:

1. **Klik na řádek** v seznamu segmentů
2. **Klik na čáru segmentu** na mapě
3. **Klik na šedý marker** (start/konec) neaktivního segmentu

**Poznámka**: Pokud je kurzor v režimu "přidávání bodu" (nový segment nebo CTRL), klik na neaktivní segment **nepřepne segment**, ale **přidá bod** na toto místo.

### Přidání nového segmentu

1. Klik na tlačítko **"Nový"** v hlavičce sekce Segmenty
2. Vytvoří se nový prázdný segment (0 waypointů) v módu "routing"
3. Segment se automaticky aktivuje
4. První klik na mapu vytvoří start

### Smazání segmentu

1. Klik na menu tlačítko (⋮) u segmentu
2. Vybrat **"Smazat segment"**
3. Potvrdit smazání
4. Segment se odstraní (včetně všech waypointů)

### Rozdělení segmentu

Segment lze rozdělit na dva segmenty v průjezdním bodu (waypointu), který není na kraji.

**Postup:**
1. Pravý klik na průjezdní bod (ne na první ani poslední) aktivního segmentu
2. Vybrat **"Rozdělit segment"** z kontextového menu
3. Segment se rozdělí na dva segmenty v daném bodě

**Výsledek:**
- **První segment**: Obsahuje waypointy od začátku do rozdělovacího bodu (včetně)
- **Druhý segment**: Obsahuje kopii rozdělovacího bodu a všechny zbývající waypointy
- **Mód**: Nový segment má stejný mód (routing/manual) jako původní segment
- **Geometrie**: Obě geometrie se přepočítají (routing přes API, manual přímé čáry)
- **Pozice**: Nový segment se přidá hned za původní segment v seznamu segmentů
- **Aktivní segment**: V editačním módu zůstane aktivní první segment

**Omezení:**
- Funkce je dostupná pouze pro průjezdní body, které nejsou na kraji (ne první, ne poslední waypoint)
- Funkce je dostupná pouze v editačním módu

### Změna módu segmentu (ze seznamu)

1. Klik na menu tlačítko (⋮) u segmentu
2. Vybrat **"Změnit na plánování"** nebo **"Změnit na ruční"**
3. Segment se přepočítá podle nového módu

**Omezení**: Změna na plánování je možná pouze pokud segment má ≤15 waypointů.

### Schránka segmentů

V editačním panelu, pod seznamem segmentů, se zobrazí sekce **"Schránka"** (pouze pokud je ve schránce uložen segment):

```
┌─────────────────────────────┐
│ Schránka      [Vložit do    │
│                trasy]       │
├─────────────────────────────┤
│ Plánovaný (5 bodů)         │
├─────────────────────────────┤
│ Vyčistit schránku           │
└─────────────────────────────┘
```

**Funkce:**

#### Kopírování segmentu do schránky

1. Klik na menu tlačítko (⋮) u segmentu v seznamu
2. Vybrat **"Kopírovat do schránky"**
3. Segment se zkopíruje do virtuální schránky (jeho waypointy a typ plánování)
4. Sekce "Schránka" se zobrazí pod seznamem segmentů

**Omezení:**
- Schránka může obsahovat maximálně 1 segment
- Při kopírování nového segmentu se předchozí obsah schránky přepíše

#### Vložení segmentu ze schránky

1. Pokud je ve schránce segment, zobrazí se tlačítko **"Vložit do trasy"** (modré, vpravo od nadpisu "Schránka")
2. Klik na tlačítko **"Vložit do trasy"**
3. Segment ze schránky se zkopíruje do aktuální trasy jako nový segment
4. Pro routing segmenty se automaticky přepočítá geometrie přes API
5. Nový segment se automaticky aktivuje pro editaci

**Poznámka:** Segment zůstává ve schránce i po vložení, takže je možné ho vložit vícekrát.

#### Vyčištění schránky

1. Klik na odkaz **"Vyčistit schránku"** pod informacemi o segmentu
2. Segment se odstraní ze schránky
3. Sekce "Schránka" zmizí

**Poznámka:** Schránka je trvalá během celé relace aplikace - segment zůstává ve schránce i po zavření a otevření jiné trasy.

## Interakce s mapou

### Klik na mapu

Chování závisí na kontextu:

| Kontext | Akce | Výsledek |
|---------|------|----------|
| **Běžný režim** | Klik na trasu | Otevře detail trasy (nebo zobrazí menu) |
| **Detail trasy** | Klik na trasu | Otevře detail této trasy |
| **Editace, nový segment (0 bodů)** | Klik | Přidá start waypoint |
| **Editace, aktivní segment, CTRL drženo** | Klik | Přidá routing waypoint na konec |
| **Editace, aktivní segment, bez CTRL** | Klik na neaktivní segment | Přepne segment do editace |
| **Editace, aktivní segment, bez CTRL** | Klik na mapu (mimo trasu) | Žádná akce |
| **Editace** | Klik na jinou trasu | Žádná akce (ostatní trasy jsou read-only) |

### Pravý klik

| Kontext | Akce | Výsledek |
|---------|------|----------|
| **Běžný režim** | Pravý klik na mapu | Zobrazí menu s trasami v místě |
| **Editace** | Pravý klik na waypoint | Zobrazí kontextové menu waypointu |

### Drag & Drop

- **Waypointy aktivního segmentu**: Draggable, přesunutí přepočítá geometrii
- **Waypointy neaktivních segmentů**: Nejsou draggable (jsou to jen šedé markery)

### Hover efekty

- **Běžný režim**: Hover nad trasou ji zvýrazní
- **Editační režim**: 
  - Hover nad čárou aktivního segmentu → zobrazí hover marker pro midpoint
  - Hover nad neaktivním segmentem → zobrazí tooltip s číslem segmentu

## Kurzory myši

| Stav | Kurzor | Popis |
|------|--------|-------|
| **Nový segment (0 bodů)** | `crosshair` | Kříž - připraveno přidat start |
| **CTRL drženo (přidávání routing bodu)** | `crosshair` | Kříž - připraveno přidat routing waypoint |
| **Hover nad čárou (midpoint)** | `crosshair` | Kříž - připraveno přidat midpoint |
| **Výchozí v editaci** | `default` | Standardní kurzor |
| **Běžný režim** | `default` | Standardní kurzor |

**Důležité**: Všechny režimy přidávání bodů používají **stejný kurzor** (`crosshair`) pro konzistentní UX.

## Vizualizace

### Segmenty na mapě

| Typ segmentu | Vzhled | Barva |
|--------------|--------|-------|
| **Routing (plánovaný)** | Plná čára | Barva trasy |
| **Manual (ruční)** | Čárkovaná čára (10px, 10px) | Barva trasy |

**Poznámka**: Čárkování je viditelné pouze v editačním režimu pro aktivní trasu.

### Waypoint markery

#### Aktivní segment

| Typ waypointu | Vzhled | Barva | Velikost | Interaktivita |
|---------------|--------|-------|----------|---------------|
| **Start** | Kruh | `#4CAF50` (zelená) | 16px | Draggable |
| **Konec** | Kruh | `#F44336` (červená) | 16px | Draggable |
| **Routing waypoint** | Kruh | `#FFC107` (žlutá) | 14px | Draggable |
| **Manual waypoint** | Kruh | `#90CAF9` (bledě modrá) | 14px | Draggable |

#### Neaktivní segmenty

| Typ markeru | Vzhled | Barva | Velikost | Interaktivita |
|-------------|--------|-------|----------|---------------|
| **Start marker** | Kruh | `#888888` (šedá) | 10px | Kliknutelný (aktivuje segment) |
| **End marker** | Kruh | `#888888` (šedá) | 10px | Kliknutelný (aktivuje segment) |

**Poznámka**: Všechny markery mají bílý okraj (2-3px) a stín pro lepší viditelnost.

### Hover marker (midpoint)

- **Vzhled**: Zelený kruh (24px) s bílým křížkem (+)
- **Zobrazení**: Pouze při hover nad čárou aktivního segmentu
- **Podmínky**:
  - Zobrazí se pokud je myš < 20px od čáry
  - Skryje se pokud je myš < 20px od existujícího waypointu
- **Akce**: Klik přidá waypoint na pozici markeru

## Kontextová menu

### Menu waypointu

Zobrazí se při **pravém kliku na waypoint** aktivního segmentu:

```
┌─────────────────────────────┐
│ 🗑 Smazat bod               │
├─────────────────────────────┤
│ ⏱ Změnit segment na        │
│    plánování                │
│ ✏️ Změnit segment na ruční │
├─────────────────────────────┤
│ ✂️ Rozdělit segment        │
└─────────────────────────────┘
```

**Možnosti:**
- **Smazat bod**: Odstraní waypoint. Pokud by segment měl <2 body, zobrazí se dotaz na smazání segmentu.
- **Změnit segment na plánování**: Dostupné pouze pokud segment má ≤15 waypointů. Změní mód celého segmentu.
- **Změnit segment na ruční**: Změní mód celého segmentu na manual.
- **Rozdělit segment**: Dostupné pouze pro průjezdní body, které nejsou na kraji (ne první, ne poslední). Rozdělí segment na dva segmenty v daném bodě. Rozdělovací bod bude koncem prvního segmentu a jeho kopie začátkem druhého segmentu. Nový segment bude mít stejný mód jako původní segment. Po rozdělení se přepočítá geometrie obou segmentů (routing přes API, manual přímé čáry). V editačním módu zůstane aktivní první segment.

**Poznámka**: Změna módu se týká **celého segmentu**, ne jen jednoho waypointu.

### Menu segmentu (v seznamu)

Zobrazí se při kliku na menu tlačítko (⋮) u segmentu v seznamu:

```
┌─────────────────────────────┐
│ 📋 Kopírovat do schránky     │
├─────────────────────────────┤
│ ⏱ Změnit na plánování      │
│ ✏️ Změnit na ruční         │
├─────────────────────────────┤
│ 🗑 Smazat segment           │
└─────────────────────────────┘
```

**Možnosti:**
- **Kopírovat do schránky**: Zkopíruje segment (jeho waypointy a typ plánování) do virtuální schránky. Schránka může obsahovat maximálně 1 segment.
- **Změnit na plánování**: Dostupné pouze pokud segment má ≤15 waypointů
- **Změnit na ruční**: Vždy dostupné
- **Smazat segment**: Vyžaduje potvrzení

### Menu trasy

Zobrazí se při kliku na menu tlačítko (⋮) v hlavičce **detail panelu**:

```
┌─────────────────────────────┐
│ 📋 Kopírovat trasu          │
├─────────────────────────────┤
│ 🗑 Smazat trasu             │
└─────────────────────────────┘
```

**Možnosti:**
- **Kopírovat trasu**: Vytvoří kopii trasy se všemi segmenty a atributy, otevře detail nové kopie
- **Smazat trasu**: Vyžaduje potvrzení, smaže celou trasu a vrátí na seznam tras

**Poznámka**: Menu bylo přesunuto z editačního panelu do detail panelu, aby bylo dostupné i v read-only režimu.

### Routes Menu (výběr tras v místě)

Zobrazí se ve dvou případech:

1. **Klik na trasu** (běžný režim): Pokud je v místě více než jedna trasa
2. **Pravý klik na mapu** (běžný režim): Zobrazí všechny trasy v místě

```
┌─────────────────────────────┐
│ Trasy v místě:              │
├─────────────────────────────┤
│ 🔴 Cesta na Sněžku          │
│    Počet segmentů: 3         │
├─────────────────────────────┤
│ 🔵 Krkonošská magistrála   │
│    Počet segmentů: 5        │
└─────────────────────────────┘
```

**Parametry:**
- Tolerance detekce: 20 pixelů od kurzoru
- Seřazení: Podle vzdálenosti (nejbližší první)
- Zobrazení: Barevný indikátor, název, počet segmentů
- Akce: Klik na trasu ji aktivuje pro editaci

## Atributy trasy

Atributy jsou **společné pro celou trasu** a všechny její segmenty. Formulář je v editačním panelu:

### Povinné atributy

- **Typ trasy** (`routeType`): 
  - Hiking (Turistická trasa)
  - Foot (Pěší trasa)
  - FitnessTrail (Běžecká trasa)
  - ViaFerrata (Via ferrata)

### Volitelné atributy

- **Číslo / zkratka** (`ref`): Textové pole
- **Název** (`name`): Textové pole
- **Barva** (`color`): Dropdown s možností "Vlastní" (pak se zobrazí color picker)
- **Značka** (`symbol`): Textový popis značení
- **Rozsah** (`network`): 
  - Iwn (Mezinárodní)
  - Nwn (Národní)
  - Lwn (Lokální)
- **Wikidata** (`wikidata`): ID ve formátu Q12345
- **Další data** (`customData`): Rozbalitelná sekce s textovým polem pro poznámky

**Virtualizované metody zobrazení:**

Třída `Route` poskytuje metody pro konzistentní zobrazení dat napříč UI:

#### `route.getTitle()` - Název trasy

Určuje se pomocí **coalesce** (první nenulová hodnota):
1. `ref` (číslo/zkratka) - pokud je vyplněno
2. `name` (název) - pokud je vyplněno
3. `"noname"` - fallback, pokud není vyplněno ani `ref`, ani `name`

**Příklad:**
- `ref = "0001"`, `name = null` → `"0001"`
- `ref = null`, `name = "Cesta na Sněžku"` → `"Cesta na Sněžku"`
- `ref = null`, `name = null` → `"noname"`

#### `route.getSubtitle()` - Podnázev trasy

Vrací **český název typu trasy** (`routeType`):
- `'Hiking'` → `"Turistická trasa"`
- `'Foot'` → `"Pěší trasa"`
- `'FitnessTrail'` → `"Běžecká trasa"`
- `'ViaFerrata'` → `"Via ferrata"`

#### `route.getColor()` - HEX barva trasy

Určuje se podle následující logiky:

1. **Pokud `color === null`**:
   - Vrátí `#808080` (šedá, výchozí barva)

2. **Pokud `color === 'Other'`**:
   - Vrátí `customColor` (vlastní HEX barva z color pickeru)
   - Pokud `customColor` není vyplněno, vrátí `#808080`

3. **Jinak** (standardní barva z enum):
   - Vrátí HEX hodnotu z `ROUTE_COLOR_ENUM` pro danou barvu
   - Pokud barva není v enumu, vrátí `#808080`

**Příklad:**
- `color = 'Red'` → `"#FF0000"` (z enum)
- `color = 'Other'`, `customColor = '#FF5733'` → `"#FF5733"`
- `color = 'Other'`, `customColor = null` → `"#808080"`
- `color = null` → `"#808080"`

**Použití:**
Tyto metody se používají ve všech UI komponentách:
- Seznam tras (zobrazení názvu a barvy)
- Tooltips na mapě
- Routes menu (výběr tras v místě)
- Status bar

## Validace a chybové stavy

### Validace segmentu

- **Minimální počet waypointů**: 2 (start + cíl)
- **Nevalidní segmenty** se automaticky zahazují při:
  - Uložení trasy
  - Přepnutí na jiný segment
  - Přidání nového segmentu

### Validace trasy

- **Minimální počet validních segmentů**: 1
- **Uložení trasy**: 
  - Pokud trasa nemá žádný validní segment → zobrazí se alert
  - Nevalidní segmenty se automaticky odstraní
- **Export GPX**: Trasy bez validních segmentů se přeskočí

### Omezení routing segmentů

- **Maximální počet waypointů**: 15
- **Přidání waypointu**: Pokud by segment měl >15 bodů, operace se neprovede
- **Změna módu na routing**: Dostupné pouze pokud segment má ≤15 waypointů

### Stornování nové trasy

Pokud uživatel vytvoří novou trasu a stornuje ji **před přidáním alespoň jednoho validního segmentu**, trasa se automaticky odstraní.

## Ukládání a načítání

### Export GPX

- **Akce**: Tlačítko "Uložit" v hlavním toolbaru
- **Výsledek**: Vytvoří se GPX soubor se všemi trasami
- **Filtrování**: Trasy bez validních segmentů se přeskočí
- **Formát**: Každý segment = jeden `<trkseg>` element

### Import GPX

- **Akce**: Tlačítko "Nahrát" v hlavním toolbaru
- **Podporované formáty**: 
  - Nový formát (s `gpxx:SegmentMode`)
  - Starý formát (automatická detekce)
- **Výsledek**: 
  - Každý `<trkseg>` se načte jako samostatný segment
  - Pokud GPX obsahuje více `<trkseg>`, vytvoří se trasa s více segmenty
- **Poznámka**: Import nevyžaduje API volání (geometrie je v GPX)

## Loading indikátor

- **Zobrazení**: Pouze při routing operacích (API volání)
- **Text**: "Plánuji trasu..."
- **Poznámka**: Manual operace jsou okamžité, bez indikátoru

## Klávesové zkratky

| Klávesa | Akce | Kontext |
|--------|------|---------|
| **CTRL** | Přidá routing waypoint | Drženo při kliku na mapu v editačním režimu |
| **ESC** | Zavře aktuální režim | 
|  | - V editačním režimu: Zruší editaci (s potvrzením pokud byly změny) → vrátí na detail trasy |
|  | - V detail režimu: Zavře detail → vrátí na seznam tras |
| **ALT** | (Nepoužívá se) | - |

**Poznámka**: ALT klávesa byla v předchozí verzi použita pro manual waypointy, ale v novém modelu se mód určuje na úrovni segmentu, ne jednotlivých waypointů.

## Status bar

Zobrazuje se v horní části mapy a ukazuje aktuální stav:

- **"Nevybraná trasa"** - běžný režim, žádná aktivní trasa
- **"Editace trasy: [název]"** - editační režim s názvem aktivní trasy
- **"Segment X z Y"** - informace o aktivním segmentu (v editačním režimu)

## Help hinty

V editačním panelu, na konci scrollovatelného obsahu, jsou zobrazeny nápovědné hinty:

```
💡 CTRL + klik – přidá plánovaný bod
💡 Klikněte na segment pro jeho editaci
```

## Technické poznámky

### Z-ordering

- Aktivní segment je vždy vykreslen **nad** ostatními segmenty
- Zajišťuje správnou editaci i při překrývání
- Implementováno pomocí `bringToFront()` na Leaflet polyline

### Event propagation

- Klik na neaktivní segment v režimu "přidávání bodu" **nepřeruší** event - klik projde na mapu a přidá bod
- Klik na neaktivní segment v běžném editačním režimu **přeruší** event a aktivuje segment
- Hover marker se skryje před přepnutím segmentu, aby se zabránilo nechtěnému přidání midpointu

### Optimalizace renderingu

- Při změně aktivního segmentu se přerenderují pouze dotčené vrstvy
- Neaktivní segmenty používají jednoduché šedé markery (méně DOM elementů)
- Hover marker se aktualizuje pouze při pohybu myši nad aktivním segmentem

### CSS styling detail panelu

**Hlavička detail panelu:**
- Tlačítko zpět má `width: auto !important` a `flex-shrink: 0`, aby se neroztahovalo na celou šířku (přepisuje obecný styl `button { width: 100%; }`)
- Layout používá flexbox s tlačítkem vlevo, nadpisem uprostřed (flex: 1) a menu vpravo

**Nadpis "Segmenty":**
- Styl `.segments-section > h4` zajišťuje konzistentní vzhled nadpisu v detail panelu
- Barva: `#9e9e9e` (šedá), velikost: `14px`, `text-transform: uppercase`, `letter-spacing: 0.5px`
- Aplikuje se na nadpisy přímo v `.segments-section` (bez wrapperu `.segments-header`)

---

*Dokumentace aktualizována: Prosinec 2025*
