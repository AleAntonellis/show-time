# 🧭 Diario di bordo — ShowTime

Registro cronologico delle **decisioni** e dei **progressi** del progetto, così da non perdere nulla.
Documento vivo: aggiornato a ogni passo di lavoro.

> Ultimo aggiornamento: 2026-09-30 (dettaglio titolo TMDB)

---

## 1. Visione (dagli appunti iniziali)

App **personale** per tracciare film e serie TV visti / da vedere, per **poche persone** (io + 1).
Esperienza da *"serata sul divano"*: intuitiva, curata, veloce. Estetica cinematografica *living room*.

Requisiti chiave: catalogo personale, lista "Da vedere", storico visioni, statistiche, multi-utenza
leggera, condivisione via link privato, dark mode.

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
| D9 | Distinzione film / serie | Film: *Da vedere* / *Visto*. Serie: **tracking per episodio** | Richiesta dell'utente (in lavorazione) |
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
| `profiles` | Utenti (estende `auth.users`, creato da trigger) |
| `titles` | Cache condivisa metadati TMDB (poster, durata, generi, `total_episodes`) |
| `library_items` | Titolo salvato da un utente: stato, priorità, rating, note |
| `viewings` | Una riga per visione (nota + voto per singola visione) |
| `episode_watches` | Episodi visti per le serie (per il tracking per episodio) |
| `episode_viewings` | Più visioni dello stesso episodio, ciascuna con data, nota e voto |
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
  servizio episodi, Libreria differenziata (film 2 stati, serie con progresso) e modale
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
- [x] Dettaglio titolo TMDB (trama, uscite, nuove stagioni)
- [x] Statistiche (ore viste, generi, trend mensili)
- [x] Home “living room” operativa
- [x] Navigazione web compatta con hamburger e logout
- [x] Condivisione singolo titolo via link
- [x] Contatti e condivisione interna con Inbox
- [x] Link monouso per contatto reciproco e registrazione Inbox
- [x] Centro reminder in-app per nuove stagioni / uscite entro 10 giorni
- [x] Diario delle visioni commentate o valutate
- [x] Calendario mensile delle prossime uscite TV
- [x] Deploy web su Azure Static Web Apps + test produzione
- [ ] *(v2)* Build iOS nativa via EAS + TestFlight
