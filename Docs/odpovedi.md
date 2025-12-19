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