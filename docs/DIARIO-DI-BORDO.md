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
| D5 | Hosting web (futuro) | **Vercel** | Deploy da GitHub, HTTPS, free |
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

Sicurezza: **RLS** ovunque — ogni utente accede solo ai propri dati. `titles` è cache condivisa
fra utenti autenticati. RPC `add_to_library(...)` fa upsert atomico titolo + voce di libreria.

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

## 6. Prossimi passi (backlog)

- [x] Note e voto per singola visione di film ed episodi
- [x] Dettaglio titolo TMDB (trama, uscite, nuove stagioni)
- [x] Statistiche (ore viste, generi, trend mensili)
- [x] Home “living room” operativa
- [x] Navigazione web compatta con hamburger e logout
- [ ] Condivisione lista via link privato
- [x] Centro reminder in-app per nuove stagioni / uscite entro 10 giorni
- [ ] Deploy web su Vercel + test PWA
- [ ] *(v2)* Build iOS nativa via EAS + TestFlight
