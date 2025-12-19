Uděláme výraznou změnu práce se segmenty jedné trasy. Aktuálně jsme ve stavu, že trasa je jedna linie, mohou se střídat plánované a ruční segmenty, které na sebe navazují. Spousta logiky je vjenovaná tomu, aby výsledkná geometrie byla souvislá (posun ručních waypointů an routovací síť apod.)

Nově chceme, aby trasu opět tvořilo více segmentů. Každý segment je buď ruční, nebo plánovaný (ten může mít max. 15 wp). Změna je, že segmenty na sebe nenavazují, každý má svůj vlastní start a cíl. Vlastně je to zjednodušení (odpadá logika navazování). Naopak složitější bude UI, musíme v rámci trasy umět vytvářet a pracovat s více segmenty.

Ukládání do GPX (obecně do dat, máme virtuální datovou vrstvu) zůstane stejné. Atributy jsou společné pro trasu, v extension segmentů uvádím mod segmentu. Model trasy v paměti asi také (ověř si to)

UI - běžný pohled
Do mapy vykresluji všechny segmenty trasy (vlastně jako doposud). Veškerá logika je stejná. Na hover se zvyraznují opět všechny segmenty. Logika kliku na trasu a prévého tlačítka opět zůstáváa.

UI editace a vytváření trasy
Zde budou změny
Tlačítko nová trasa vytvoří stejně jako doposud novou trasu a automaticky první segment, bez bodů. První klik vytvoří start (nemusím nic držet). Pro přidání dalšího nového bodu na konec segmentu musím držet Ctrl. Defaultně je segment v modu plánování. V kontextovém menu na všech bodech segmentu bude Změnit na ruční/plánování. To už tam máme, ale týká se to jen jednoho bodu. Nově se to bude týkat celé trasy (může to tedy být i na Start bodu, kde to nyní není). Přidání průjezdních bodů funguje stále stejně - najetí myší na čáru, ikona plus.

Pod seznamem atributů bude seznam segmentů trasy. Nad ním bude tlačítko přidat Nový segment (malé oranžové) - to založí nový segment s nula body, kliknutí (opět bez ničeho pro start) vytvoří první bod.
Do řádku seznamu vypiš pořadové číslo segmentu, jeho typ (ruční, plánovaný) a 3 tečky - kontextové menu s nabídkou smazání segmentu (potvrzení) a můžeme zde znovu dát přepínač modu segmentu (stejný jako na bodech).

Kliknutím na řádek segmentu se tento přepne do editace (řádek bude zvýrazněný). Právě jeden segment z trasy je v editaci (tj. vidím nad ním řídící body, mohu je přidávat přetahovat, přidávat průjezdní). Ostatní segmenty editované trasy jsou pouze vykreslené.
Do editace přepnu segment také tím, že na něj kliknu (vypnu editaci stávajícího segmentu a začnu na novém)

Segment musí mít minimálně dva body (to teď máme hlídané, ale pro celou trasu). Založím li nový segment, tak dokud nemá dva body, tak je neplatný (tj. když v tu chvíli dám uložit, tak se neuloží, když dám nový segment, tak se starý nekomplentí zahodí atd..)

Storno a Uložení ukládá či ruší změny ve všech segmentech editované trasy, stejně jako doposud.

Tlačítko Uložit a Storno přesuneme nahoru nad Atributy. Obsah panelu pod ním (tj. atributy a seznam segmentů) dejme do scrolovací části, ať se na ně dá dostat i na nízkých monitorech.

1 - asi mi dává smysl, aby každý segmenet měl svoje pole waypointů. Už z toho duvodu, že v GPX je to pak vlastně stejně, trackeg má své wpt.

2 - pokud stávající trasy mají více trkseg, načtu je nově jako samostatné segmenty. Vizuálně budou ležet za sebou, ale každý bude mít svůj start (měl by to být první trkpt. 

3 - jestli se nepletu, tak v GPX vypadá takto
@gpxStorage.md (80-88) 
takže metadata o routovacích bodech jsou pro každý trkseg (čili náš segment) samostatně. A  trkpt pak jdou od startu do cíle v daném segmentu. Takže si myslím, že změna vlastně nutná není.

4 - ano, při změně modu nahrad geometrie, bud za přímky, nebo přeplánuj. Zde mne napadá nová podmínka, změna modu z ručního na plánování je možná pouze tehdy, pokud počet bodů v jeho geometrii je menší než 15 - protože se z nich musí stát waypointy (a přidat vše do metadat).

5 - nevím, zda  mod má vůbec význam u bodu. Všechny body v segmentu jsou v modu celé trasy (nově). A start je prostě první bod v segmenu. (resp, řídící bod u metadat v routovaném segmenu - kliknu někam, ale geometrie se vytvoří posunutá na rotovací sít - tuto logiku řídících bodů u routovacího segmentu už máme, separátně uchováváme start, cíl, wpt) a znich přes api tvoříme geometrii.

6 - asi ano, plánovaný, routovaný, routing... geometrie nejsou přímky, ale resolví se přes API.

7 - ano, právě jeden segment z trasy je v editačním modu a jen na něj funguí editace (tj přidání nového bodu přes ctrl na konec, posun stávajících bodů, kontextové menu nad nimi, přidání průjezdních bodů). Ostatní segmenty reagují pouze na klik - přepnou se do editace.

8 - nemělo by nastávat, pokud ano, nech to na leafletu, aktivuj segment v hořejší vrstvě. Editovan segment vždy přesun nahoru, aby fungovala dobře editace. 

9 - zatím nevalidní segmenty zahazuj. Jak při uložení trasy, tak při aktivaci jiného segmentu.

10 - dobrá poznámka. Editovaný segment se pozná tak, že má na sobě barevné řídící body. Neditované segmenty editované trasy ale nejdou nijak poznat, přidejme na ně nějaké malé šedé body na start a cíl (nejsou nijak interaktivní), ať je nějak odlišíme.

11 - trasa se dostane do stejného modu, jako když kliknu na nová trasa, tj. založí se prázdný segment s nula body a čeká se, že se naklikne start.

Již je vše jasné?