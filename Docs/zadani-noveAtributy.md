# Zadání – rozšíření a úprava třídy `Route`

Cílem je **upravit datový model `Route`**, jeho **ukládání, načítání, editaci a vykreslování**, a to tak, aby podporoval strukturované OSM-like atributy, byl zpětně kompatibilní se stávajícími GPX daty a umožňoval budoucí rozšiřitelnost.

---

## 1. Změna datového modelu `Route`

### 1.1 Nahrazení stávajících atributů

Stávající atributy:
- `name`
- `displayColor`

**budou nahrazeny** novou sadou atributů definovaných níže.  
Původní atributy zůstanou podporovány **pouze pro zpětnou kompatibilitu při načítání GPX**.

---

## 2. Pevně definované atributy `Route`

| Uživatelský název | Datový název | Typ | Hodnoty enumu | Default |
|---|---|---|---|---|
| Typ trasy | `routeType` | enum | `Hiking`, `Foot`, `FitnessTrail`, `ViaFerrata` | `Hiking` |
| Barva | `color` | enum | `Red`, `Blue`, `Green`, `Yellow`, `Black`, `Brown`, `Orange`, `Purple`, `Other` | `null` |
| Vlastní barva | `customColor` | string | – | `null` |
| Značka | `symbol` | string | – | `null` |
| Název | `name` | string | – | `null` |
| Číslo / zkratka | `ref` | string | – | `null` |
| Rozsah trasy | `network` | enum | `Iwn`, `Nwn`, `Lwn` | `Nwn` |
| Wikidata | `wikidata` | string | – | `null` |
| Vlastní data | `customData` | string | – | `null` |

---

## 3. Zpětná kompatibilita (GPX import)

Při načítání GPX:

- `Name` → mapuj do:
  - `name` (pokud není vyplněno jinak)
- `DisplayColor` → mapuj do:
  - `color`
  - pokud hodnota neodpovídá enumu → nastav `color = Other` a hodnotu ulož do `customColor`

> Při ukládání se **původní atributy `Name` a `DisplayColor` již nepoužívají**.

---

## 4. Pravidla pro práci s barvou

- Pokud `color == Other`:
  - používej hodnotu z `customColor`
- Pokud `color == null`:
  - trasu vykresluj **šedivě** (default rendering color)
- `customColor` je relevantní **pouze při `color == Other`**

---

## 5. Titulky a popisky tras

### 5.1 Titulek trasy
Sestavuj podle pravidla:

coalesce(ref, name, "noname")


### Subtitulek trasy
- zobrazuj hodnotu `routeType`

---

## 6. Editor (UI)

- Enumové atributy zobrazuj jako **selectboxy**
- Stringové atributy zobrazuj jako textová pole
- Všechny atributy kromě `routeType` jsou nepovinné

---

## 7. Definice enumů

- Hodnoty enumů definuj **centrálně v kódu**
- Enumy musí být snadno rozšiřitelné bez zásahu do UI
- Každá hodnota enumu musí obsahovat:
  - interní hodnotu (anglicky, dle tabulky)
  - český název pro UI (selectboxy, titulky, popisky)

### Příklad struktury:
```json
{
  "value": "Hiking",
  "label": "Turistická trasa"
}

Tato struktura bude použita:

v editoru (selectboxy),

při vykreslování titulků a popisků,

v dalších UI částech.

8. Shrnutí cíle
Výsledkem má být:

rozšířený a flexibilní model Route,

zachovaná zpětná kompatibilita při importu GPX,

jednotné chování v editoru i vykreslování,

snadná budoucí rozšiřitelnost enumů i atributů.

