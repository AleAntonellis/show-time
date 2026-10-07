# 🧭 Diario di bordo — ShowTime

Registro cronologico delle **decisioni** e dei **progressi** del progetto, così da non perdere nulla.
Documento vivo: aggiornato a ogni passo di lavoro.

> Ultimo aggiornamento: 2026-10-07 (pubblicazione Encore)

---

## 1. Visione (dagli appunti iniziali)

App **personale** per tracciare film e serie TV visti / da vedere, per **poche persone** (io + 1).
Esperienza da *"serata sul divano"*: intuitiva, curata, veloce. Estetica cinematografica *living room*.

Requisiti chiave: catalogo personale, lista "Da vedere", storico visioni, statistiche, multi-utenza
leggera, condivisione via link privato, tema dark esclusivo.

---

## 2. Decisioni tecniche (ADR sintetici)

| # | Decisione | Scelta | Motivo |
|---|-----------|--------|--------|
| D1 | Come installare senza App Store | **Web-first (PWA)** ora, pivot iOS nativo poi | 0 €, nessun Mac, entrambi installano subito via "Aggiungi a Home" |
| D2 | Framework | **Expo (React Native + react-native-web)** | Un solo codice → Web/PWA oggi, iOS nativo domani (`eas build`) |
| D3 | Backend / auth / dati | **Supabase** (Postgres + Auth + RLS) | Free tier, login semplice, RLS per privacy, sharing futuro |
| D4 | Metadati film/serie | **TMDB API** | Gratuita, poster, uscite, stagioni, localizzata `it-IT` |
| D5 | Hosting web | **Azure Static Web Apps** | Credito Visual Studio, deploy GitHub, HTTPS e preview |
| D6 | Gestione segreti | Chiavi in **`.env.local`** (gitignored) | Mai committare credenziali; `.env.example` come modello |
| D7 | Autenticazione v1 | Email/password Supabase, **conferma email disattivata** | Semplicità massima per 2 utenti |
| D8 | Colore di sfondo | `#040212` (aggiornato dal precedente `#0B0E1A`) | Preferenza estetica dell'utente |
| D9 | Distinzione film / serie | Film: *Da vedere* / *In corso* / *Visto*. Serie: **tracking per episodio** | Stati manuali per i film, progresso derivato per le serie |
| D10 | Revisioni degli episodi | Tracking in `episode_watches`, storico multiplo in `episode_viewings` | Conserva progresso e più visioni con note/voti separati |
| D11 | Navigazione dettaglio | `Stack` radice + gruppo `(tabs)` + route statica `/title` | Query TMDB condivisibile e compatibile con export PWA statico |
| D12 | UX episodi condivisa | Tracking inline nel dettaglio, stesso contenuto dentro il modal Libreria | Un'unica implementazione, meno cambi di contesto |
| D13 | Home operativa | Dashboard personale “living room” costruita dalla libreria | Accesso quotidiano immediato a progressi e prossimi titoli |
| D14 | Navigazione web | Barra compatta con hamburger e menu centralizzato | Più spazio ai contenuti e UX coerente su PWA mobile |
| D15 | Calcolo statistiche | Eventi film + episodi, storico dettagliato prioritario sulla spunta | Evita doppi conteggi e include le revisioni reali |
| D16 | Reminder in-app | Solo eventi dei titoli in libreria tra oggi e +10 giorni | Segnale utile e poco rumoroso, senza push o backend aggiuntivo |
| D17 | Contenuto del Diario | Solo visioni con almeno una nota o un voto | Timeline significativa, senza rumore dalle semplici spunte |
| D18 | Calendario serie | Vista mensile + agenda del giorno, solo episodi futuri della libreria | Pianificazione leggibile e mobile-first |
| D19 | Accesso ai Reminder | Campanella dedicata con badge prima dell'hamburger | Uscite imminenti visibili senza aprire il menu |
| D21 | Azioni primarie web | Home e Cerca sempre visibili nella barra | Navigazione più immediata, burger riservato alle sezioni secondarie |
| D22 | Hero Home | Saluto personale + logo senza scritta su fondo libero | Riduce il rumore visivo e porta subito ai contenuti |
| D23 | Condivisione v1 | Link canonico alla scheda del singolo titolo | Nessun dato personale esposto; il destinatario usa la propria libreria |
| D24 | Condivisione interna | Follow one-way con accettazione + Inbox titoli | Evita spam e mantiene mittente/destinatario protetti da RLS |
| D25 | Inviti da link esterno | Token hashato, monouso, 7 giorni e consenso esplicito | Collega condivisione esterna e Inbox senza esporre identità nell'URL |
| D26 | Storico importato | Progresso e ore sì; trend, timeline e visioni registrate no | Mantiene pulite le statistiche senza inventare date |
| D27 | Film già visti | Contatore importato separato dalle visioni datate | Permette import + revisioni future senza perdere ore o inquinare i trend |
| D28 | Profilo follower | Libreria e Diario read-only per follower accettati, inclusi quelli esistenti | Estende il social senza rendere pubblici i dati personali |
| D29 | Attività social titolo | Tre attività recenti + lista completa cronologica dei profili seguiti | Porta il contesto sociale nella scheda senza creare un feed separato |
| D30 | Dove guardarlo | Paese privato configurabile, provider dentro Informazioni, cache 24 h | Dati regionali utili senza introdurre link esterni inaffidabili |
| D31 | Ricerca globale | Input espandibile nella barra web + fallback `/search`; titoli e crediti persone separati | Ricerca accessibile da ogni sezione senza perdere il contesto corrente |
| D32 | Aggregazioni oltre 1000 righe | Paginazione PostgREST condivisa per libreria, episodi e statistiche | Evita contatori e progressi troncati negli account con molto storico |
| D33 | Continua a guardare | Mostra solo serie con episodi non visti pubblicati entro oggi | Separa il backlog disponibile dalle uscite future gestite da Reminder/Calendario |
| D34 | Completati di recente | Solo titoli con almeno una visione reale datata | Gli importati puri restano nel catalogo senza simulare attività recente |
| D35 | Tema applicazione | Solo dark “living room”, senza adattamento al sistema | Identità cinematografica coerente e nessun flash/sfondo bianco cross-device |
| D36 | Filtri media | All/Film/Serie TV indipendenti per pagina | Lettura coerente di catalogo, attività e statistiche senza stato globale implicito |
| D37 | Indicatori Calendario | Anello arancione Film, viola Serie TV, split per giorni misti | Il tipo di uscita è leggibile direttamente nella griglia mensile |
| D38 | Trend settimanali | Slider Home + pagina dedicata con i primi 20 TMDB, filtri media e cache oraria | Offre scoperta aggiornata senza rallentare né bloccare i contenuti personali |
| D39 | Film interrotti | Stato manuale In corso e presenza in Continua a guardare | Consente di ricordare un film iniziato senza registrare una visione completata |
| D40 | Metriche contestuali | Con filtro Film, nascondere card e testi esclusivamente episodici | Evita valori irrilevanti e rende Home e Statistiche coerenti col media selezionato |
| D41 | Cast e regia nei dettagli | Primi 10 interpreti seguiti dallo slider dei registi; crediti aggregati per le serie | Mostra foto, nomi, personaggi ed episodi diretti senza bloccare il dettaglio principale |
| D42 | Dettaglio persona | Profilo TMDB con tab Interprete/Regia, filtri media indipendenti e 30 titoli progressivi | Gestisce persone con più ruoli e filmografie estese senza sovraccaricare la pagina |
| D43 | Libreria nella filmografia | Badge esplicito In libreria / Non in libreria, aggiornato al ritorno dal titolo | Consente di distinguere subito i titoli già gestiti senza caricare storico episodi e visioni |
| D44 | Testi lunghi social/Diario | Tre righe iniziali con Leggi tutto / Mostra meno direttamente nella card | Rende leggibile il testo completo senza nuove route né navigazioni involontarie |
| D45 | Visioni complete serie | Storico multiplo con data, nota e voto, separato dal tracking episodio | Allinea l’UX ai film e supporta i rewatch senza duplicare progresso o ore |
| D46 | Commenti dei contatti | “Dai tuoi contatti” mostra solo visioni e recensioni con nota testuale | Elimina spunte e voti isolati, lasciando solo contenuti social leggibili |
| D47 | Fondazioni badge | Definizioni DB versionate, valutatori TypeScript in Edge Function e progressi RLS | Impedisce scritture client e mantiene sblocchi idempotenti e verificabili |
| D48 | Sala trofei Cinefilo | Patch a quattro livelli, progresso massimo, menu unseen e banner aggregato | Prima verticale badge completa, mobile-first e non bloccante |
| D49 | Totali Statistiche | Titoli, episodi e tempo catalogato basati solo sui completati; i rewatch moltiplicano il tempo | Allinea il riepilogo al significato del badge e non attribuisce durata a contenuti non completati |
| D50 | Badge introduttivi | Primo ciak, Prima recensione e Stagione chiusa come traguardi singoli; Speciali esclusi | Offre feedback iniziale verificabile prima delle soglie cumulative più alte |
| D51 | Visto oggi e Diario film | “Visto oggi” apre subito data, nota e voto; una RPC completa il placeholder dello stesso giorno | Evita doppie visioni senza impedire rewatch reali, anche nella stessa data |
| D52 | Archivista | Tutte le voci distinte della Libreria contribuiscono, in qualunque stato e tipo media | Premia la cura del catalogo personale senza confonderla con i titoli completati |
| D53 | Nostalgico | Titoli completati con anno TMDB valido fino al 1989, film e serie, importati inclusi | Premia l’esplorazione del catalogo storico con una regola deterministica |
| D54 | Serialista | Serie TMDB `Ended` con ogni episodio regolare completato; Speciali esclusi | Premia completamenti verificabili senza far dipendere lo sblocco da serie ancora in corso |
| D55 | Esploratore di generi | 15 categorie canoniche ricavate da ID TMDB e alias storici; `TV Movie` escluso | Misura la varietà del catalogo senza duplicare generi equivalenti tra film e serie |
| D56 | Ancora un episodio | Massimo storico di episodi `tracked` distinti della stessa serie e data; Speciali esclusi | Premia una sessione reale senza sommare importazioni, serie o giorni differenti |
| D57 | Maratoneta | Stagioni distinte da almeno 8 episodi, tutti `tracked` in una o due date consecutive; soglie 1/5/15/30 | Premia completamenti verificabili senza dipendere dall’ordine di registrazione o da orari non disponibili |
| D58 | Encore | Titoli distinti con due visioni reali, oppure import completo seguito da una visione reale; soglie 5/25/100/250 | Premia i rewatch verificabili senza contare due importazioni o progressi serie misti |
| D20 | Prima pubblicazione | Azure Static Web Apps Free in West Europe | Ambiente personale/dev-test semplice e reversibile |

### Percorso di distribuzione
```
v1 (ora)      →  PWA installabile (Expo Web)      · 0 €, no Mac
v2 (opzionale)→  App iOS nativa (EAS Build)         · Apple Developer 99 €/anno, TestFlight
```

---

## 3. Identità visiva

Palette *"sala cinema al tramonto"*: base scura, glow blu freddo (sx) + arancio caldo (dx).

| Elemento | HEX |
|---|---|
| Sfondo principale | `#040212` |
| Glow blu | `#2F6BFF` |
| Glow arancio | `#FF6A2C` |
| Viola tenue | `#6A4CFF` |
| Bianco | `#FFFFFF` |

Loghi in [`docs/`](.): `LogoShowTime.png`, `LogoShowTimeW.png`. Palette originale in `palette-colori.csv`.

---

## 4. Modello dati (Supabase)

Migrations in [`../supabase/migrations/`](../supabase/migrations).

| Tabella | Contenuto |
|---|---|
| `profiles` | Utenti (estende `auth.users`, creato da trigger, include `watch_region`) |
| `titles` | Cache condivisa metadati TMDB (poster, durata, generi, `total_episodes`) |
| `library_items` | Titolo salvato da un utente: stato, priorità, rating, note |
| `viewings` | Una riga per visione (nota + voto per singola visione) |
| `episode_watches` | Episodi visti per le serie (per il tracking per episodio) |
| `episode_viewings` | Più visioni dello stesso episodio, ciascuna con data, nota e voto |
| `series_viewings` | Più visioni complete della serie, ciascuna con data, nota e voto |
| `user_follows` | Richieste e relazioni accettate tra profili pubblici |
| `title_shares` | Titoli inviati tra contatti, messaggio e stato letto |
| `title_share_invites` | Inviti esterni monouso con hash, scadenza e account destinatario |

Sicurezza: **RLS** ovunque — l’accesso diretto resta limitato ai propri dati. `titles` è
cache condivisa fra utenti autenticati. RPC read-only dedicate verificano il follow
accettato e proiettano solo Libreria, Diario e attività titolo, senza email, UUID o
timestamp interni.
RPC `add_to_library(...)` fa upsert atomico titolo + voce di libreria.

---

## 5. Progressi (log cronologico)

### 2026-09-29
- ✅ Ristrutturato il README dagli appunti.
- ✅ Deciso stack: Web-first PWA con Expo, pivot iOS (D1–D5).
- ✅ Scaffold progetto Expo + tema ShowTime (palette, logo come icona/splash, PWA).
- ✅ Integrazione **TMDB**: ricerca titoli con debounce + griglia poster (schermata "Cerca").
  Testato dal vivo (query reali, poster `it-IT`).
- ✅ **Modello dati Supabase** (profiles, titles, library_items, viewings) + RLS + RPC.
- ✅ **Auth** (login/registrazione) con gate; **salvataggio** titoli nelle liste
  (Da vedere / In corso / Visto); schermata **Libreria** con cambio stato e rimozione.
  Testato end-to-end: registrazione → salvataggio → persistenza dopo reload.
- ✅ Cambiato sfondo a `#040212` (tema + splash + PWA).
- ✅ Aggiunto questo diario di bordo in `docs/`.
- ✅ **Tracking per episodio (serie TV)** — migration `0002`, endpoint TMDB tv/stagioni,
  servizio episodi, Libreria differenziata (film con stati manuali, serie con progresso) e modale
  episodi con checklist per stagione. **Testato end-to-end**: salvataggio serie con
  totale episodi (62), spunta/desunta episodi, stato derivato (Da vedere → In corso),
  progresso `X/Y` e persistenza dopo reload. Rimossa query HEAD di conteggio (usato il
  conteggio ottimistico lato client) per evitare abort in chiusura.

---

- ✅ **"Segna tutti / Azzera" per stagione** nel modale episodi — scrittura in batch
  (upsert multiplo / delete per stagione), stato e progresso ricalcolati. Testato: marcata
  e azzerata un'intera stagione (13 ep.) con persistenza dopo reload.

### 2026-09-30
- ✅ **Note e voto per singola visione dei film** — nuovo pannello "Visioni" con data,
  voto opzionale da 0 a 10 e nota distinta per ogni visione. Lo storico è ordinato dal
  più recente, supporta le revisioni e la rimozione delle singole registrazioni.
- ✅ Registrare una visione porta automaticamente il film nello stato **Visto**; se
  l'aggiornamento dello stato fallisce, la nuova registrazione viene annullata per
  mantenere i dati coerenti.
- ✅ Test locale end-to-end su Expo Web: aggiunto un film da TMDB, verificata la
  validazione del voto, salvata una visione con data/nota/voto, confermati cambio
  automatico a **Visto** e persistenza dopo navigazione, quindi eliminate visione e
  film di prova. Nessun errore runtime nei log Metro.
- ✅ **Storico visioni per singolo episodio** — ogni episodio apre lo stesso pannello
  usato dai film e può avere più visioni, ciascuna con data, nota e voto. La prima
  visione registrata spunta automaticamente l'episodio e aggiorna il progresso della
  serie; eliminare una voce dallo storico non rimuove la spunta di progresso.
- ✅ Separati intenzionalmente `episode_watches` (stato/progresso) e
  `episode_viewings` (diario delle visioni), con RLS per utente nella migration `0003`.
- ✅ Migration `0003` applicata e test locale end-to-end su Breaking Bad S1E1: salvate
  due visioni distinte, verificati storico, persistenza e passaggio automatico della
  serie a **In corso · 1/62**. Rimossi poi entrambi i record e la spunta di prova,
  ripristinando **Da vedere · 0/62**.
- ✅ Completate ulteriori prove manuali locali dell'utente sul flusso libreria,
  episodi e storico delle visioni, senza problemi aggiuntivi segnalati.
- ✅ **Dettaglio titolo TMDB** per film e serie, raggiungibile da ricerca e libreria:
  backdrop, poster, trama localizzata, tagline, voto TMDB, generi, durata, data di
  uscita, stato e metadati specifici delle serie.
- ✅ Per le serie il dettaglio mostra numero di stagioni/episodi, prossimo episodio
  quando disponibile e lista delle stagioni con poster, data e conteggio episodi.
- ✅ Routing riorganizzato secondo Expo Router: `Stack` radice, gruppo `(tabs)` per
  Home/Cerca/Libreria e route `/title?mediaType=…&id=…` fuori dai tab. La route resta
  statica per essere compatibile con l'export PWA; il ritorno conserva schermata e
  ricerca di provenienza e gestisce anche deep link/reload.
- ✅ Test locale con Breaking Bad, Inception e Dune: dati TMDB corretti, navigazione
  da Libreria e Cerca, query preservata al ritorno e nessun nuovo errore runtime.
- ✅ Export Expo Web statico completato: `/title` viene generata come pagina reale,
  evitando il limite delle route dinamiche arbitrarie su hosting statico.
- ✅ **Scheda titolo operativa come la Libreria**: aggiunta/rimozione del titolo,
  stato *Da vedere/Visto* per i film, accesso a note e visioni, progresso serie e
  tracking completo delle serie direttamente dal dettaglio.
- ✅ Le stagioni nel dettaglio serie sono espandibili una alla volta: gli episodi
  vengono caricati solo all'apertura e mostrano checkbox, titolo, data, trama e
  sezione inline **Note e visioni** con storico, voto e note.
- ✅ Aggiunti i poster delle stagioni anche nel modale di tracking episodi della Libreria.
- ✅ Test locale su Breaking Bad, Inception e Dune: espansione stagione, apertura dei
  modali condivisi, aggiunta dalla scheda, cambio stato e rimozione del titolo di prova.
  Dune è stato rimosso al termine e nessun errore runtime è comparso nei log Metro.
- ✅ Estratto un unico contenuto condiviso per stagioni/episodi: la scheda serie lo
  mostra inline, mentre la Libreria lo presenta nel proprio modal rapido. Verificati
  progresso 7/62, cambio stagione, storici esistenti e regressione del modal film.
- ✅ **Home “living room” operativa** al posto dello scaffold: saluto personale,
  riepilogo di titoli/progressi, sezione *Continua a guardare*, lista *Da vedere* e
  titoli completati di recente.
- ✅ Tutte le card Home aprono la scheda titolo e il ritorno preserva la Home; i dati
  vengono ricaricati a ogni focus per riflettere subito modifiche fatte altrove.
- ✅ Testata con i dati reali (Breaking Bad 7/62 e Inception), navigazione dettaglio,
  stato vuoto watchlist e viewport mobile 390×844 senza overflow. Nessun dato modificato.
- ✅ Sostituita la barra web completa con **brand + hamburger**. Il menu contiene
  Home, Cerca, Libreria e Logout; rimosso il link Docs e nascosto il logout duplicato
  dall'intestazione della Libreria web.
- ✅ Il menu usa i trigger headless ufficiali di Expo Router, si chiude dopo la
  navigazione o toccando lo sfondo ed espone gli stati attivi. Testato su desktop e
  PWA mobile a 390 px; logout visualizzato ma non eseguito per preservare la sessione.
- ✅ Rifinita la navigazione web con 16 px di respiro tra barra e pagina; nascosti gli
  indicatori verticali di scorrimento su schermate e modali, mantenendo attivi mouse,
  touch e trackpad. Verificato visivamente a 390 px e con scroll programmatico.
- ✅ Il brand **ShowTime** nella barra è ora un link diretto alla Home e chiude anche
  l'eventuale menu aperto. Testato il percorso Libreria → ShowTime → Home.
- ✅ **Dashboard Statistiche** con riepilogo libreria, episodi completati, ore stimate,
  media voti, attività degli ultimi sei mesi, generi e timeline recente navigabile.
- ✅ Le revisioni episodio sostituiscono la singola spunta nel conteggio degli eventi:
  un episodio con due visioni dettagliate vale due, non tre. I film segnati *Visto*
  senza storico valgono una visione alla data dell'ultimo aggiornamento.
- ✅ Runtime e generi mancanti vengono recuperati una volta da TMDB e salvati nella
  cache `titles`; la durata TV usa anche il runtime dell'ultimo/prossimo episodio.
- ✅ Validata sui dati reali: 2 titoli, 7 episodi, 9 visioni, media 9,5 e circa 9,9 ore.
  Verificati grafico semestrale, timeline → dettaglio → Statistiche e viewport 390 px.
- ✅ **Centro Reminder in-app** per film in uscita, debutti/nuove stagioni e prossimi
  episodi dei soli titoli presenti in libreria.
- ✅ Finestra temporale esatta: oggi e il decimo giorno sono inclusi; eventi passati o
  dall'undicesimo giorno in poi sono esclusi. Date TMDB invalide vengono ignorate.
- ✅ Cache TMDB in memoria per 15 minuti, massimo quattro richieste concorrenti,
  refresh manuale e segnalazione esplicita dei titoli che non è stato possibile controllare.
- ✅ Con Breaking Bad e Inception lo stato vuoto è corretto: nessun evento nei prossimi
  10 giorni. Verificati refresh, menu web/native, confini temporali e viewport 390 px.
- ✅ Caso positivo verificato manualmente dall'utente: aggiungendo American Horror
  Story, il centro mostra `Nuovo episodio · S13 E4 · Domani (01/10/2026)` nella
  sezione **Molto presto**, con conteggio `1 in arrivo`.
- ✅ **Diario personale** con timeline raggruppata per data, filtri Tutto/Film/Serie TV
  e sole visioni che hanno almeno una nota o un voto. Ogni ricordo apre il titolo.
- ✅ **Calendario mensile** delle serie in libreria con griglia lunedì-domenica, indicatori
  per giorno, navigazione fino a 12 mesi, agenda del giorno e refresh TMDB.
- ✅ La cache TMDB di dettagli e stagioni è ora condivisa tra Reminder e Calendario;
  il calendario carica solo la stagione rilevante e usa la première come fallback se
  gli episodi non sono ancora pubblicati.
- ✅ Dati reali verificati: Diario con 2 ricordi di Breaking Bad; ottobre 2026 con
  10 episodi futuri di American Horror Story e 3 uscite il 1° ottobre. Filtri,
  navigazione dettaglio/ritorno e viewport 390 px superati.
- ✅ Spostato Reminder fuori dal dropdown web: campanella dedicata prima del burger,
  stato arancio e badge numerico quando ci sono eventi. Il conteggio viene aggiornato
  a ogni navigazione tramite la cache condivisa; gli errori sono segnalati con `!`.
- ✅ Test positivo con American Horror Story: badge `1`, click campanella → Reminder,
  chiusura automatica del menu e layout 390 px verificati.
- ✅ Rivista la barra web/PWA: icona Home e pulsante Cerca con lente sono ora sempre
  visibili a sinistra; rimossi i duplicati Home/Cerca dal burger e il grande CTA di
  ricerca dalla Home. Verificati stati attivi, navigazione e viewport 390 px.
- ✅ Semplificata ulteriormente la Home: rimosso il box “Cosa guardiamo?”, mantenuto
  il saluto personale e centrato il nuovo `LogoShowTimeNoScritta.png`. Verificata la
  composizione su desktop e viewport mobile 390 px.
- ✅ **Condivisione singolo titolo** dalla scheda: Web Share su dispositivi compatibili,
  copia del link su desktop e Share nativo su iOS/Android. Il link contiene solo
  `mediaType` e id TMDB, senza stato, note o identificativi del mittente.
- ✅ Test end-to-end del link condiviso: apertura sulla PWA Azure, login/registrazione,
  ritorno automatico alla scheda e azioni collegate alla libreria del destinatario.
- ✅ **Condivisione interna ShowTime**: username pubblico univoco, ricerca utenti,
  richieste follow accettabili, contatti autorizzati, messaggio opzionale e Inbox
  Ricevuti/Inviati.
- ✅ RLS e RPC impediscono scritture dirette e permettono l'invio solo lungo una
  relazione accettata; email, note e libreria del mittente non vengono esposte.
- ✅ Badge Inbox Realtime, stato non letto, apertura del titolo e ricevuta
  *Consegnato/Letto* verificati end-to-end con `@ale` e `@testshowtime`.
- ✅ I link esterni ora includono un token casuale di 256 bit; nel database resta solo
  l'hash SHA-256. Il primo account autenticato lo reclama e il link scade dopo 7 giorni.
- ✅ Il destinatario sceglie **Accetta contatto** oppure **Apri soltanto**. L'accettazione
  crea due relazioni reciproche e registra la condivisione interna già letta; l'apertura
  semplice consuma il link senza creare contatti o messaggi.
- ✅ Flusso invito verificato tra `@ale` e `@testshowtime`: contatto reciproco, Inbox,
  token rimosso dopo “Apri soltanto” e nessun record interno nel ramo senza consenso.
- ✅ Token inesistente verificato: viene mostrato un errore esplicito, mentre la scheda
  TMDB resta consultabile e utilizzabile normalmente.
- ✅ Distinte le spunte episodio `tracked` e `imported`. Gli importati mantengono
  progresso, stato serie ed ore catalogate, ma non generano eventi mensili o recenti.
- ✅ `Segna tutti` ora richiede di scegliere tra **Visti oggi** e **Già visti prima**;
  stagione e serie possono essere escluse o incluse nuovamente nella cronologia senza
  perdere il progresso. Le visioni con data/nota/voto restano sempre eventi reali.
- ✅ Rimosso l'evento sintetico dei film semplicemente segnati *Visto*: contribuiscono
  a completati e tempo catalogato, ma entrano nella timeline solo con una visione esplicita.
- ✅ Test reale Breaking Bad: `7/62` e `9,9 h` invariati; attività e visioni registrate
  passate da 8 a 2, conservando solo le due revisioni esplicite. Verificati bulk import,
  conversione reversibile, spunta singola “oggi” e ripristino dei dati di test.
- ✅ Anche i film offrono la scelta **Visto oggi** / **Già visto prima di ShowTime**.
  Le visioni importate sono conteggiate separatamente e si sommano alle revisioni reali
  nelle ore catalogate, ma non generano date o attività mensili.
- ✅ Un film con una sola visione già conteggiata espone **Modifica origine**: la visione
  può passare da importata a “oggi” (o viceversa) senza aumentare il totale. Note e voti
  non vengono rimossi automaticamente.
- ✅ I film già `Visto` senza storico sono stati inizializzati automaticamente con una
  visione importata. Test Inception: import preservato, revisione “oggi” aggiunta e
  rimossa, ore/trend aggiornati e poi ripristinati; scelta importata verificata.
- ✅ Riorganizzata la pagina **Statistiche**: Libreria, totali catalogo, generi, trend
  semestrale, ultimi 30 giorni e attività recente. Il riepilogo mobile riusa i quattro
  box dei totali e mostra titoli unici (film/serie), episodi, tempo realmente visto e
  voti; usa solo eventi datati ed esclude gli importati. Verificati `0` film, `1` serie,
  `2` episodi, `1,9 h` e media `9,5`.
- ✅ Aggiunto il **profilo follower** read-only su `/profile`: un follower accettato vede
  tutti gli stati della Libreria, il progresso episodi e il Diario con data, voto e nota
  completa. Accessi da Contatti e Inbox, Diario paginato e copia esplicita al momento
  dell’accettazione. Le RPC della migration `0008` verificano la relazione one-way e non
  espongono email, UUID o timestamp interni. Test reale `@testshowtime → @ale`: Libreria
  `2`, Breaking Bad `62/62`, Diario `1`; profilo inesistente negato e layout 390 px senza
  overflow.
- ✅ Aggiunta in fondo alla scheda titolo la sezione **Dai tuoi contatti**: riepilogo,
  media voti, tre attività recenti e lista completa paginata in ordine cronologico.
  La migration `0009` include solo film ed episodi con data reale, esclude gli importati
  e deduplica la spunta episodio quando esiste uno storico dettagliato. Test reali:
  Ladies First (`1` visione, media `8,0`, nota completa), Breaking Bad (`2` revisioni
  S1E1, media `9,5`, importati esclusi) e Due spicci (`8` episodi, anteprima `3`,
  espansione completa e riduzione). Link al profilo e layout 390 px verificati.
- ✅ Aggiunto **Dove guardarlo** dentro Informazioni per film e serie: categorie
  abbonamento, gratis/con pubblicità, noleggio e acquisto con loghi provider e
  attribuzione JustWatch. Le categorie usano accordion esclusivi: tre provider iniziali,
  **Guarda tutte**, **Mostra meno** e reset passando a un'altra categoria. La nuova
  pagina **Impostazioni** salva privatamente il paese tramite migration `0010` (Italia
  predefinita). Cache persistente verificata: `24 h` per `tipo/id/paese`, `30 giorni`
  per le regioni, nessuna nuova chiamata entro il TTL e refresh manuale forzato. Testati
  cambio Italia/Francia e ripristino, Matrix e Breaking Bad in Italia, menu web, layout
  390 px e assenza di overflow.
- ✅ Corretta la Home con librerie numerose: il carosello dei completati non impone più
  la propria larghezza intrinseca al `ScrollView` verticale. Testato con l'account
  Alessio (`16` titoli, `959` episodi): documento da `595` a `390 px`, titoli lunghi
  contenuti nelle card, scroll verticale/orizzontale preservati e desktop centrato a
  `800 px`.
- ✅ Applicata la stessa correzione ai **Reminder**: il titolo lungo “Hanno ucciso
  l'Uomo Ragno…” non porta più la pagina da `390` a `498 px`; card, badge e azioni
  restano nel viewport mobile, con layout desktop da `800 px` invariato.
- ✅ Audit globale a `390 px` su Home, Cerca, Libreria, Statistiche, Reminder, Diario,
  Calendario, Contatti, Inbox, Impostazioni, Profilo e dettagli film/serie. Tutte le
  altre route restano entro il viewport. Stress test superati anche per risultati Cerca
  con titoli lunghi e profilo `@arianna8` con `30` titoli.
- ✅ Corretto anche il **Calendario** quando si apre l'agenda di un giorno: il 9 ottobre,
  con “Hanno ucciso l'Uomo Ragno…”, portava la pagina da `390` a `473 px`. Vincolati
  `ScrollView`, pannello mensile e card agenda; verificati a `390 px` tutti i 12 giorni
  con eventi di ottobre, viewport telefono `390×844` e `360×800` con scroll verticale,
  e desktop centrato a `800 px`.
- ✅ La ricerca web ora vive nella barra superiore: al tap occupa tutta la barra,
  nasconde le altre azioni e apre un overlay quasi full-screen con focus automatico,
  cancellazione, `Esc`/Chiudi e pagina sottostante preservata. `/search` resta il
  fallback Expo Router/mobile.
- ✅ Estesa la ricerca a persone TMDB: sezioni **Titoli**, **Con …** e **Diretto da …**
  per le prime tre persone corrispondenti, massimo 12 titoli rilevanti per sezione,
  duplicati cast/regia rimossi e apparizioni “Self” escluse. Testati Matrix, Tom Hanks
  (Forrest Gump/Toy Story/Il miglio verde), Christopher Nolan, query parziale `Chris`
  con tre persone, stato In libreria, apertura dettaglio e viewport `360×800`.
- ✅ Aprendo un risultato e tornando dal dettaglio, la ricerca globale ripristina
  overlay, query, risultati e posizione di scroll; **Chiudi** o una nuova ricerca
  cancellano lo stato sospeso. La cache di sessione evita nuove chiamate TMDB al back.
- ✅ Corretto il limite PostgREST di `1000` righe: Home, Libreria, singola serie,
  storici e Statistiche recuperano ora tutte le pagine con ordinamento stabile. Il
  limite faceva apparire serie a `0` episodi e bloccava il totale Home a `1000`.
  Verificato sull'account Alessio durante l'importazione: Home da `1000` a `4658`
  episodi, Young Sheldon `127/141`, Statistiche oltre `4596` importati e layout mobile
  ancora a `390 px`. La migration `0011` riallinea inoltre gli stati serie al progresso.
- ✅ **Continua a guardare** ora confronta progresso e ultimo episodio pubblicato da
  TMDB, includendo le uscite di oggi ed escludendo serie con soli episodi futuri.
  Se data o richiesta non sono verificabili, la serie resta visibile con avviso.
  Test reale Alessio: `7` serie In corso, `4` con backlog disponibile (American Horror
  Story, Break Point, Futurama e Scrubs); richieste TMDB limitate a `4` concorrenti.
- ✅ **Completati di recente** esclude film e serie con solo storico importato. Un titolo
  misto torna visibile dopo una nuova visione reale; l'ordinamento usa l'ultima data
  registrata da film viewings, episodi `tracked` o revisioni episodio. Test reale
  Alessio: la sezione mostra solo Ladies First invece degli oltre cento importati.
- ✅ Eliminato il profilo light: `DarkTheme`, palette, Native Tabs, Expo config, StatusBar,
  HTML/PWA e CSS usano sempre `#040212` e `color-scheme: dark`. Rimossi gli hook di tema
  automatico. Verificati sistema light/dark, primo frame, hydration, login senza sessione,
  viewport 390 px, export statico e Expo Doctor `21/21`.
- ✅ Estratto il filtro condiviso **All / Film / Serie TV** e applicato a Diario, Home,
  Libreria, Statistiche e Calendario. Home filtra contatori e liste; Statistiche ricalcola
  ogni sezione dalla stessa fotografia dati; Calendario include ora anche le uscite film.
  Testati dati reali Alessio (`152` totali, `12` film, `140` serie), layout 390 px e,
  con data simulata al 1° maggio 2026, uscita Ladies First il 21 maggio.
- ✅ Nel Calendario i piccoli dot sono stati sostituiti da anelli completi attorno al
  giorno: arancione per Film, viola per Serie TV e bordi divisi sui giorni misti.
  Gli eventi multipli mantengono un badge numerico nell'angolo; aggiunta anche la legenda.
  Verificati ottobre 2026 (serie e badge) e maggio 2026 (Ladies First, anello film).
- ✅ Aggiunto in Home lo slider **Trend della settimana** dopo “Da vedere” e prima di
  “Completati di recente”. `All` usa la classifica mista TMDB, mentre Film e Serie TV
  usano gli endpoint dedicati; persone e contenuti adulti sono esclusi e le risposte
  restano in cache per un'ora. Un errore mostra un messaggio con riprova senza bloccare
  la Home. Test reale: `All` 12 film + 8 serie, Film 20, Serie TV 20; dettaglio titolo,
  ritorno alla Home e viewport 390 px verificati.
- ✅ Aggiunto **Mostra tutti** allo slider Trend: la route `/trends` presenta i primi
  20 risultati in una lista verticale nello stile Libreria, con posizione in classifica
  e filtri indipendenti `All / Film / Serie TV`. Verificati dettaglio, ritorno con filtro
  preservato, ritorno alla Home e assenza di overflow a 390 px.
- ✅ Aggiunto lo stato manuale **In corso** anche ai film, già supportato dal vincolo
  database e quindi senza migration. I film interrotti contribuiscono ai contatori,
  appaiono in “Continua a guardare” con CTA “Riprendi” e rispettano i filtri media.
  Test end-to-end con Digger: aggiunta, cambio stato, Home, gruppo Libreria e successiva
  rimozione completa del dato di prova; viewport 390 px senza overflow.
- ✅ Con il filtro **Film**, Home nasconde “Episodi visti” e Statistiche nasconde le
  card “Episodi completati” sia nei totali sia negli ultimi 30 giorni. Le etichette
  mostrano solo i film e la descrizione del trend mensile non cita gli episodi importati.
  Con `All` e `Serie TV` le metriche episodiche restano disponibili. Verificato a 390 px.
- ✅ Aggiunti **Cast** e **Diretto da** nella scheda titolo. Dopo i primi 10 interpreti,
  il secondo slider mostra tutti i registi accreditati con foto; nelle serie sono ordinati per episodi diretti e ne
  mostrano il conteggio. Il Cast resta limitato ai primi 10 con nome e personaggio.
  L'ordine della scheda è Trama, Informazioni, Cast e Diretto da.
  Film e serie condividono un'unica richiesta a `/movie/{id}/credits` o
  `/tv/{id}/aggregate_credits`, con cache di 15 minuti ed errore con riprova che non
  blocca il dettaglio. Verificati Digger (1 regista) e Breaking Bad (25 registi),
  ordine, ruoli, console pulita e assenza di overflow a 390 px.
- ✅ Aggiunta la route `/person` raggiungibile da Cast, Diretto da e ricerca. Mostra
  foto, professione, nascita, luogo e biografia espandibile, quindi tab indipendenti
  **Interprete** e **Regia** con filtri `All / Film / Serie TV`. Le filmografie complete
  sono deduplicate, ordinate per data e mostrate 30 alla volta con “Mostra altri”.
  Verificato Bryan Cranston: 155 titoli interpretati dopo esclusione delle apparizioni
  “Self”, 9 diretti, filtri ruolo/media preservati tornando dai dettagli, ricerca e query
  ripristinate, console pulita e viewport 390 px senza overflow.
- ✅ Ogni titolo della filmografia persona mostra **In libreria** o **Non in libreria**.
  Il controllo usa una query paginata sulle sole chiavi media/TMDB, senza aggregare
  episodi e visioni, e si aggiorna a ogni ritorno sulla pagina. Test end-to-end con
  Breaking Bad già presente e Special Unit aggiunto/rimosso temporaneamente; dati puliti.
- ✅ Messaggi Inbox e commenti Diario mostrano tre righe e possono essere espansi inline
  con **Leggi tutto / Mostra meno**. Il toggle ferma la propagazione, quindi non apre
  involontariamente il titolo; lo stesso comportamento è usato nel Diario dei follower.
  L'espandibilità è rilevata misurando le righe reali, non il numero di caratteri.
  Verificati il messaggio Inbox su Matthew Perry (60→80→60 px) e una nota Diario
  temporanea sotto i 120 caratteri; URL invariati, viewport 390 px senza overflow e
  successiva rimozione completa del dato di prova.
- ✅ Aggiunto **Note e visioni** anche alle serie, con lo stesso modal dei film e storico
  multiplo per i rewatch. `0012` introduce la struttura iniziale e `0013` la converte in
  `series_viewings`, rimuovendo l’unicità e aggiornando RPC follower/attività titolo.
  Le visioni complete entrano nel Diario personale e condiviso come “Serie completa”,
  ma ore, progresso e Statistiche restano basati sugli episodi. Test end-to-end su
  I Simpson con due visioni (8,0 e 9,0): Diario da 3 a 5, profilo `@ale` a 5, esclusione
  dalle Statistiche e ritorno a 3 dopo la rimozione; dati temporanei completamente puliti.
- ✅ **Dai tuoi contatti** ora restituisce solo film, episodi e visioni complete di serie
  con una nota testuale non vuota. `0014` filtra lato RPC dopo aver calcolato il numero
  revisione sullo storico completo. Test reali: Ted Lasso da 34 spunte senza commento
  a zero risultati; Aftersun mantiene il commento di Arianna come Revisione 2, voto 5,0.
- ✅ Completata la **Fase 1 badge** con migration `0015` e fix `0016`: famiglie e livelli
  versionati, progressi corrente/massimo, sblocchi permanenti, unseen state, RLS e RPC
  idempotente riservata al `service_role`. La Supabase Edge Function autenticata contiene
  registry e valutatore Cinefilo; il client può soltanto invocare e leggere. Test
  `@testshowtime`: progresso `3/50`, seconda valutazione idempotente, quattro livelli
  leggibili e scrittura diretta bloccata `403`. Test SQL transazionale a 500: tre livelli
  senza duplicati, massimo storico 500 dopo regressione a 3 e rollback senza dati fittizi.
- ✅ Completata la prima verticale **Cinefilo**: Sala trofei `/badges`, patch illustrate
  Bronzo/Argento/Oro/Platino, progresso massimo, prossimo livello, menu globale con unseen
  e banner aggregato. Backfill automatico al login e rivalutazione non bloccante dopo
  mutazioni Libreria. Test `@testshowtime`: UI `3/50`, refresh idempotente e cambio
  reversibile Matrix `Visto → Da vedere → Visto`, con progresso corrente `3→2→3`,
  massimo storico sempre `3`, nessuna visione creata e layout 360/390 px senza overflow.
- ✅ I **Totali completati** delle Statistiche contano solo film e serie nello stato
  `Visto`; gli episodi restano basati sulle spunte completate. Il tempo catalogato esclude
  film non completati e storici episodio senza spunta, mentre ogni rewatch valido aggiunge
  nuovamente la durata, inclusa la combinazione import iniziale + visione successiva.
- ✅ Implementato localmente il **Batch A1 badge**: Primo ciak considera film, episodi
  `tracked`, revisioni episodio e visioni complete serie; Prima recensione richiede una
  nota testuale; Stagione chiusa verifica tutti gli episodi tramite TMDB, accetta importati
  ed esclude Stagione 0 / Speciali. Sala trofei estesa a 7 traguardi con tre nuove patch,
  backfill multi-badge, trigger mirati e banner aggregato. Edge Function e migration
  distribuite; test `@testshowtime`: `3/7`, tre sblocchi aggregati, seconda valutazione e
  refresh manuale idempotenti, console pulita e layout reale verificato a 360/390 px.
  Prime tappe e Cinefilo sono accordion con conteggio sbloccati/totali, chiusi di default
  e aperti automaticamente per nuovi badge; il banner usa ora uno sfondo pieno.
- ✅ Corretto il flusso film **Visto oggi → Diario**: la scelta apre direttamente la form
  con `Salva nel Diario` e `Registra solo visione`. La RPC
  `record_movie_viewing` completa atomicamente l’eventuale visione vuota dello stesso
  giorno; una successiva visione dettagliata resta invece un rewatch distinto. Rimossi
  tre placeholder duplicati già presenti (due sull’account principale e uno sull’altro
  account), con audit finale `0` duplicati su tutti i profili. Test reale reversibile su
  Inception: storico `1 → 1` dopo nota/voto e ripristino completo dei dati.
- ✅ Pubblicato **Archivista**, prima famiglia del Batch A2: conta tutte le
  voci distinte della Libreria con soglie 500/1.500/2.500/5.000, loader paginato, massimo
  storico e trigger mirati ad aggiunta/rimozione. Aggiunta patch a schedario con quattro
  metalli. Engine `16/16`, test SQL transazionale e deploy Azure completati. Verifica
  produzione: `@testshowtime` `5/500` con hero `3/11`; account principale `360/500`
  con hero `4/11`; refresh idempotenti, console pulita e layout 360/390 px.
- ✅ Pubblicato **Nostalgico**: conta film e serie completati fino al 1989,
  inclusi importati, escludendo anni mancanti o malformati. Soglie
  50/150/250/500, loader paginato, trigger su stato film e progresso serie, patch a
  televisore CRT. Engine `20/20`, test SQL e deploy Azure completati. Un primo backfill
  ha restituito `409` perché il Dashboard aveva mantenuto il vecchio `index.ts`: nessun
  progresso è stato persistito, poi il bundle monolitico verificato è stato ridistribuito.
  Produzione: account principale `32/50`, hero `4/15`; Test `0/50`, hero `3/15`;
  refresh idempotenti, console pulita e layout 360/390 px.
- ✅ Pubblicato **Serialista**: serie `Ended`, verifica esatta di tutti gli
  episodi regolari e Speciali esclusi. Cache TMDB persistente con TTL 7 giorni, accesso
  riservato al `service_role`, concorrenza limitata e retry `429`. Soglie
  25/100/250/500 e patch a pila di episodi posizionata subito sotto Cinefilo. Engine
  `24/24`, test SQL e deploy Azure completati. Cache reale: 127 serie candidate,
  91 `Ended`. Produzione: account principale `91/100`, Bronzo sbloccato, hero `5/19`;
  Test `0/25`, hero `3/19`; refresh idempotenti e layout 360/390 px.
- ✅ Pubblicato **Esploratore di generi**: 15 categorie canoniche,
  mapping da ID TMDB e 24 alias reali italiani/inglesi, `TV Movie` escluso. Cache generi
  protetta, TTL 30 giorni, concorrenza limitata e retry `429`. Soglie 5/8/12/15 e patch
  a bussola. Engine `29/29`, test SQL e deploy Azure completati. Cache reale: 125 titoli.
  Produzione: account principale `15/15`, quattro livelli e banner unico, hero `9/23`;
  Test `3/5`, hero `3/23`; refresh idempotenti e layout 360/390 px.
- ✅ Pubblicato **Ancora un episodio**: massimo giornaliero di episodi
  `tracked` distinti della stessa serie, Speciali e importati esclusi. Soglie 3/5/8/12,
  deduplica per stagione+episodio, tie-break sul giorno più recente e patch a episodi
  impilati. Engine `33/33`, test SQL transazionale, Edge Function e migration
  distribuiti; deploy Azure sul commit `3bcd8df`. Backfill reale: account principale e
  Test entrambi a `0/3`. Test live reversibile su `@testshowtime`: tre episodi
  temporaneamente `tracked` nella stessa data hanno prodotto Bronzo, `3/5` e un solo
  banner; secondo refresh idempotente. Rollback verificato: visioni ripristinate
  `imported` con la data originale, sblocco rimosso, progresso/massimo `0` e UI
  nuovamente `0/3`.
- ✅ Pubblicato **Maratoneta**: conta stagioni distinte da almeno
  8 episodi regolari, tutti `tracked` nella stessa data o in due date consecutive.
  Soglie 1/5/15/30; Stagione 0 e importati esclusi; ordine di registrazione
  irrilevante e cambio mese/anno gestito correttamente. Riusa la cache TMDB protetta
  di Serialista. Aggiunti migration `0024`, test SQL, trigger mirati e patch a
  cronometro con otto episodi e traguardo. Engine `38/38`, typecheck e lint mirato
  superati. Edge Function, migration e test SQL distribuiti; deploy Azure sul commit
  `f535eb3`, run `37588921439`. Backfill Test `0/1`, hero `3/31`; test live reversibile
  su Breaking Bad S2 con 13 episodi su due date consecutive: Bronzo, `1/5`, un banner
  e refresh idempotente. Rollback completo a 13 episodi `imported`, nessuno sblocco,
  progresso/massimo `0` e UI `0/1`. Produzione senza overflow a 360/390 px né errori
  console; titoli badge ridotti a 28 px rispetto ai 32 px di Sala trofei.
- ✅ Pubblicato **Encore**: conta titoli distinti con due visioni
  complete reali, oppure una prima visione importata seguita da una visione reale.
  Per le serie accetta un completamento episodio iniziale uniforme `tracked` o
  `imported` seguito da `series_viewings`; progressi misti e `episode_viewings` sono
  esclusi dalla V1. Soglie 5/25/100/250, cache TMDB condivisa, deduplica titoli e
  storici, trigger mirati e riclassificazione film protetta da valutazioni intermedie.
  Aggiunti migration `0025`, test SQL e patch a doppio fotogramma/replay. Engine
  `43/43`, typecheck e lint mirato superati. Edge Function, migration e test SQL
  distribuiti; deploy Azure sul commit `3f14c23`, run `37591927243`. Backfill Test
  `1/5`, hero `3/35`; prova live su tutti i cinque titoli: Bronzo, `5/25`, un banner
  e refresh idempotente. Rollback verificato: eliminate 3 righe film e 4 serie,
  nessuno sblocco, progresso/massimo reali `1` e UI `1/5`. Produzione senza overflow
  a 360/390 px né errori console.
- ✅ **Pubblicazione Azure**: resource group `rg-showtime`, Static Web App
  `showtime-antonellis` (Free, West Europe), CI/CD GitHub Actions e HTTPS su
  `https://ashy-plant-0d5e71903.4.azurestaticapps.net`.
- ✅ Configurati GitHub Secrets per TMDB e Supabase; verificati login, dati reali,
  reminder, calendario, persistenza sessione e deep link dopo reload direttamente
  sull'hostname Azure.
- ✅ Aggiunti manifest PWA, icone 192/512, tema, metadati iOS, lingua italiana e titolo
  pagina. Service worker offline rimandato intenzionalmente per evitare cache aggressive;
  il token TMDB pubblico verrà protetto in seguito con un proxy Azure Function.

## 6. Prossimi passi (backlog)

- [x] Note e voto per singola visione di film ed episodi
- [x] Storico delle visioni complete delle serie nel Diario
- [x] Dettaglio titolo TMDB (trama, uscite, nuove stagioni)
- [x] Statistiche (ore viste, generi, trend mensili)
- [x] Home “living room” operativa
- [x] Navigazione web compatta con hamburger e logout
- [x] Ricerca globale per titolo, attore/attrice e regista
- [x] Dettaglio persona con biografia e filmografie complete
- [x] Condivisione singolo titolo via link
- [x] Contatti e condivisione interna con Inbox
- [x] Link monouso per contatto reciproco e registrazione Inbox
- [x] Dove guardarlo per paese con TMDB/JustWatch
- [x] Centro reminder in-app per nuove stagioni / uscite entro 10 giorni
- [x] Diario delle visioni commentate o valutate
- [x] Calendario mensile delle prossime uscite TV
- [x] Deploy web su Azure Static Web Apps + test produzione
- [ ] *(v2)* Build iOS nativa via EAS + TestFlight
