# Changelog - Routes Menu Feature

## Implementováno: Context menu pro výběr tras v místě

### Přehled změny
Přidána možnost pravým klikem na mapu zobrazit seznam všech tras, které vedou daným místem. Po kliknutí na vybranou trasu se otevře v editačním módu.

### Nové funkce

#### 1. Detekce tras v bodě (`GeometryUtils.js`)
- Nová funkce `findRoutesAtPoint(latlng, routes, maxDistancePixels, map)`
- Najde všechny trasy v dané vzdálenosti od bodu (default 20px)
- Vrací seřazený seznam od nejbližší po nejvzdálenější

#### 2. Routes Menu UI (`RoutesMenu.js`)
- Nový komponent pro zobrazení seznamu tras
- Zobrazuje:
  - Barevný indikátor trasy
  - Název trasy
  - Vzdálenost v pixelech
- Automaticky upravuje pozici, aby se vešlo na obrazovku

#### 3. Integrace v aplikaci (`app.js`)
- Handler pro `contextmenu` event na mapě
- Funguje pouze mimo editační mód
- Minimálně 1 trasa musí být v dosahu

### Upravené soubory

1. **js/services/GeometryUtils.js**
   - Přidána funkce `findRoutesAtPoint()`

2. **js/ui/RoutesMenu.js** (nový soubor)
   - Kompletní implementace Routes Menu komponenty

3. **js/ui/MapManager.js**
   - Odstraněno globální potlačení context menu
   - Umožňuje propagaci context menu eventu

4. **js/app.js**
   - Import `routesMenu` a `findRoutesAtPoint`
   - Nová metoda `_setupRoutesMenuCallbacks()`
   - Handler pro `contextmenu` v `_setupMapEventHandlers()`

5. **index.html**
   - Přidán HTML element `#routes-menu`

6. **css/styles.css**
   - Nové styly pro `.routes-menu-*` třídy

### Použití

1. **Uživatel:** Pravým tlačítkem klikne na mapu
2. **Aplikace:** Najde všechny trasy v dosahu 20px
3. **Zobrazí:** Context menu se seznamem tras
4. **Uživatel:** Klikne na vybranou trasu
5. **Aplikace:** Otevře trasu v editačním módu

### Technické detaily

- **Tolerance:** 20 pixelů od kurzoru
- **Sorting:** Podle vzdálenosti (nejbližší první)
- **Pixel distance calculation:** Konverze geo-koordinát na pixely přes Leaflet map
- **Auto-positioning:** Menu se automaticky posune, pokud by přesahovalo okraj obrazovky

### Výhody řešení

✅ Nevyžaduje real-time tracking (výkon)  
✅ Využívá existující komponenty (konzistence)  
✅ Řeší problém i pro 3+ překrývajících se tras  
✅ Intuitivní UX (pravý klik = kontextové akce)  
✅ Funguje i na touch zařízeních (long press)  

