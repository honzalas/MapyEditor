
**Prompt pro Cursor / zadání aplikace**

Jsi zkušený webový vývojář. Vytvoř prosím jednoduchou **single-page webovou aplikaci** (ideálně vše v jednom `index.html` souboru s vloženým JS a CSS), která bude sloužit k **tvorbě sítě tras nad mapou** a **přidávání atributů k jednotlivým trasám**.

### 1. Technologie a struktura

* Použij čisté **HTML + CSS + JavaScript** (bez build toolů typu Webpack/Vite, žádný Node server – jen statická stránka).
* Aplikace poběží jen v prohlížeči.
* Je možné použít knihovnu pro mapu (např. Leaflet nebo MapLibre), ale:

  * **Podklady mapy a routování musí být přes REST API Mapy.com**, ne jiné služby.
  * Dokumentaci k Mapy.com API dostaneš jako Markdown (map tiles + routing); drž se jí.
* Vše udělej jako **single-page app**:

  * Jeden HTML soubor (`index.html`) s vloženým JS (ve `<script>` na konci body) a základním CSS (buď `<style>`, nebo malý externí `.css` soubor).

### 2. Layout UI

Rozložení obrazovky:

* **Levý panel**: mapa (cca 60–70 % šířky okna).
* **Pravý panel**: nástroje a formuláře (cca 30–40 % šířky).

Chovej se responseivně:

* Na úzké obrazovce (mobil) může být mapa nahoře, panel s nástroji pod ní, ale není nutné to perfektně doladit – jde o desktop first.

### 3. Mapa a práce s trasami

**Základ:**

* Na mapě zobrazuj podklad z Mapy.com pomocí jejich tiled map API (dlaždice).
* Nad mapou/vedle mapy může být jednoduchá lišta s informací, v jakém režimu je uživatel (např. „Nevybraná trasa“, „Vytváření trasy“, „Úprava trasy XY“).

**Reprezentace trasy:**

* Trasa = polyline (geometrie) – pole souřadnic `[lon, lat]` = „spousta bodů za sebou“.
* V mapě může být **více tras současně**.
* Každá trasa má:

  * unikátní ID (např. auto-increment),
  * geometrii (pole bodů),
  * atributy (viz kapitola 5: Název, Barva).

#### 3.1 Vytvoření trasy ručně

Režim „Vytvořit trasu ručně“:

1. Uživatel spustí režim (např. tlačítkem „Nová trasa (ručně)“ v pravém panelu).
2. Pak:

   * kliknutím do mapy přidává postupně body trasy; mezi body se vykresluje polyline.
3. Uživatel může:

   * **přetahovat řídící body** (vertex polyline) myší na nové místo – po puštění se trasa přepočítá lokálně v UI (jen změna geometrií, bez volání API).
   * **vložit nový bod mezi dva body**:

     * kliknutím na segment polyline mezi existujícími body se vytvoří nový řídící bod v tomto místě, který lze pak také přetahovat.
4. Dokud je trasa v režimu vytváření/úpravy, je označená jako **aktivní**:

   * např. silnější čára nebo jiná barva obrysu.
5. Zadávání trasy se ukončí tlačítkem typu „Uložit trasu“:

   * po uložení trasa přestane být aktivní, jen se vykresluje.

#### 3.2 Vytvoření trasy pomocí routovacího API

Režim „Nová trasa (plánování)“:

1. Uživatel aktivuje režim (tlačítko „Nová trasa (routing)“).
2. Kliknutím do mapy nastaví **start** (první kliknutí) a **cíl** (druhé kliknutí).
3. Po nastavení startu a cíle:

   * zavolej **routing API Mapy.com** (dokumentace bude přiložena),
   * z výsledku vezmi trasu (polyline) a vykresli ji jako novou aktivní trasu.
4. Uživatel může:

   * **přetahovat start a cíl** (vizuálně jako markery na konci trasy),
   * po každém puštění markru (drag end) znovu zavolej routing API a trasu **přeplánuj** na nové souřadnice.
5. Po dokončení (uživatel spokojen s geometrií) klikne opět na „Uložit trasu“, trasa přestane být aktivní (stejně jako u ručního zadávání).

Volání routovacího API:

* Parametry a přesný formát endpointu vezmi z dokumentace Mapy.com (routing REST API).
* Zatím počítej jen s jedním typem plánování (např. `car_fast` nebo `foot` – vyber jeden typ a drž se ho), není třeba přidávat přepínání.

#### 3.3 Znovuotevření trasy pro editaci

* Kliknutím na jakoukoli trasu v mapě:

  * se tato trasa stane **aktivní** (editační mód).
  * její geometrii zobraz jako polyline s viditelnými řídícími body (vertex).
* V aktivním editačním módu:

  * stejné chování jako při vytváření ručně:

    * přetahování bodů,
    * přidávání bodů kliknutím na segment.
* Po dokončení editace:

  * tlačítko „Uložit změny“ (nebo znovu „Uložit trasu“) – změny se uloží,
  * trasa se přepne do pasivního (neaktivního) režimu.

### 4. Pravý panel – nástroje

Pravý panel rozděl na několik logických bloků:

1. **Seznam / stav tras (jednoduché)**

   * Krátká informace:

     * kolik tras je v projektu („Počet tras: X“),
     * která trasa je právě aktivní (např. ID nebo Název).
   * Není nutný úplný seznam s výběrem, hlavní výběr probíhá kliknutím na trasu v mapě.

2. **Režimy vytváření**

   * Tlačítka:

     * `Nová trasa (ručně)`
     * `Nová trasa (routing)`
   * `Uložit trasu` / `Uložit změny` (přístupné jen, když je nějaká trasa aktivní).

3. **Atributy aktuální trasy**

   * Panel, který se zobrazí **jen pokud je nějaká trasa aktivní**.
   * Formulář s následujícími poli:

     * `Název` – textové pole.
     * `Barva` – select s hodnotami:

       * `červená`
       * `modrá`
       * `zelená`
   * Zvolená barva ovlivní styl polyline (barvu trasy v mapě).
   * Při změně atributů:

     * okamžitě aktualizuj vzhled trasy v mapě (např. změna barvy).
     * Atributy se trvale uloží až po kliknutí na „Uložit trasu“ / „Uložit změny“.

4. **Import / Export GPX**

   * Sekce pro práci se soubory:

     * tlačítko `Načíst GPX`:

       * `<input type="file" accept=".gpx">`
     * tlačítko `Uložit GPX`:

       * stáhne lokální soubor `.gpx` se všemi aktuálními trasami.

### 5. Datový model (v JS)

Navrhni jednoduché struktury:

```js
// Jedna trasa
{
  id: number,               // unikátní ID
  name: string,             // název
  color: 'red' | 'blue' | 'green', // interní hodnota pro barvu
  coordinates: [            // geometrie
    { lon: number, lat: number },
    ...
  ]
}
```

* Vnitřní barvu můžeš držet jako anglický string (`red`, `blue`, `green`), ale v UI zobrazuj české názvy.
* Můžeš mít jedno globální pole `routes: Route[]` a proměnnou `activeRouteId`.

### 6. GPX import/export

**Export GPX:**

* Při kliknutí na „Uložit GPX“:

  * vytvoř validní **GPX XML** (verze 1.1),
  * pro každou trasu vytvoř `<trk>`:

    * `<name>` – název trasy,
    * `<trkseg>` – sekce s body,
    * jednotlivé body jako `<trkpt lat="..." lon="...">`.
  * Barvu trasy můžeš uložit např. do `<extensions>` nebo ignorovat (stačí základ).
  * Výsledek nabídni ke stažení jako `routes.gpx`.

**Import GPX:**

* Při „Načíst GPX“:

  * načti GPX soubor,
  * najdi všechny `<trk>` (tracky),
  * z každého:

    * `name` → název trasy,
    * `trkpt` → seznam souřadnic (lat, lon),
  * pro barvu zvol např. defaultně `červená` (nebo podle nějaké heuristiky, ale není to nutné).
* Naimportované trasy přidej do `routes[]` a hned je vykresli v mapě.
* Po importu může být žádná trasa aktivní, nebo lze automaticky aktivovat první naimportovanou.

### 7. Práce s Mapy.com API

**Mapové dlaždice:**

* Použij API Mapy.com pro mapové podklady (maptiles).
* Endpoint, parametry (`{z}/{x}/{y}` atd.) i API key vezmi z přiložené dokumentace.
* Do kódu zaveď jasné místo, kde se nastavuje `apiKey` (např. jednoduchá proměnná na začátku skriptu).

**Routing API:**

* Použij endpoint pro plánování trasy z REST API Mapy.com.
* Potřebuješ minimálně:

  * start (lon/lat),
  * end (lon/lat),
  * typ trasy (např. `car_fast` nebo `foot` – zvol jeden).
* Odpověď:

  * z JSON odpovědi vezmi geometrii trasy (polyline),
  * převed’ ji na pole `{ lon, lat }` pro interní odkaz v aplikaci.
* Ošetři asynchronní volání:

  * indikace, že trasa se právě plánuje (např. text „Plánuji trasu…“ v pravém panelu),
  * základní ošetření chyb (alert nebo hláška v UI, pokud API selže).

### 8. UX a vizuální detaily

* U trasy, která je aktivní:

  * zobraz řídicí body (markery),
  * zvýrazni ji (silnější nebo přerušovaná čára).
* Ostatní trasy:

  * zobraz jen jako jednoduché čáry v jejich definované barvě.
* Kliknutí:

  * kliknutím na polyline neaktivní trasy ji aktivuješ,
  * kliknutí na mapu v režimu „Nová trasa (ručně)“ přidá bod.

Není potřeba žádný login ani persistence na serveru – všechny data jsou v paměti prohlížeče, plus možnost export/import GPX.

---

Pokud potřebuješ, můžeš si tento prompt v Cursoru ještě doplnit konkrétními URL z dokumentace Mapy.com (map tiles + routing) nebo nastavit API key. Pokud chceš, v dalším kroku ti můžu z tohohle zadání rovnou udělat konkrétní kostru `index.html` (struktura, panely, základní JS bez napojení na API).
