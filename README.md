<p align="center">
  <img src="docs/LogoShowTime.png" alt="ShowTime" width="280" />
</p>

<h1 align="center">ShowTime</h1>

<p align="center">
  <em>La tua serata sul divano, organizzata.</em>
</p>

---

## 🎬 Visione

Un'app **personale** per tenere traccia di serie TV e film visti o da vedere, pensata per **pochi utenti** (uso privato o familiare).

Deve essere **intuitiva, visivamente piacevole e veloce**, con un'esperienza da *"serata sul divano"*.

> **Stato del progetto:** MVP in sviluppo — auth, ricerca TMDB, libreria, tracking episodi
> e storico delle visioni sono già funzionanti.

---

## ✨ Funzionalità

### 📚 Catalogo personale
- Lista film e serie TV
- Schede con titolo, anno, poster, stato (**visto** / **da vedere** / **in corso**)
- Note personali e rating — con note **per singola visione**: lo stesso film può farti provare cose diverse quando lo rivedi

### 🔖 Lista "Da vedere"
- Ordinabile per priorità, genere o data di uscita
- Reminder automatico per nuove stagioni o film in uscita
- Integrazione calendario per ricordare uscite o serate film

### 🕓 Storico visioni
- Timeline cronologica con data di completamento
- Statistiche: ore totali viste, generi preferiti, trend mensili

### 👥 Multi-utenza leggera
- Login semplice, ciascuno con le proprie liste

### 🔗 Social minimo
- Condivisione di una lista o di un singolo titolo via link
- Condivisione interna tra contatti accettati, con messaggio e Inbox
- Link monouso (7 giorni) con invito esplicito a diventare contatti reciproci
- Nessun feed pubblico, solo scambio privato

### 🌙 Interfaccia cinematografica
- Layout *"living room"*: TV centrale, card dei titoli come poster
- Modalità notte automatica

---

## 🎨 Identità visiva

Palette *"sala cinema al tramonto"* — base scura con glow blu freddo (sinistra) e arancio caldo (destra).

| Elemento | Colore | HEX |
|---|---|---|
| Sfondo principale | Blu notte | `#0B0E1A` |
| Glow sinistro (TV) | Blu elettrico | `#2F6BFF` |
| Glow destro (TV) | Arancio tramonto | `#FF6A2C` |
| Play centrale / testo "Show" | Bianco puro | `#FFFFFF` |
| Silhouette | Nero-blu profondo | `#121528` |
| Testo "Time" | Arancio vivo | `#FF6A2C` |
| Effetti luce secondari | Blu-viola tenue | `#6A4CFF` |

Asset in [`docs/`](docs/): loghi ([maschile](docs/LogoShowTime.png), [femminile](docs/LogoShowTimeW.png)) e [palette completa](docs/palette-colori.csv).

---

## 📦 Distribuzione & strategia a due fasi

App a uso privato per **2 persone**. Strategia **web-first con pivot su iOS nativo**:

```
        ┌─────────────────────────────┐
        │   Codebase unico (Expo/RN)  │
        └──────────────┬──────────────┘
             ┌──────────┴──────────┐
        v1 → 🌐 Web / PWA      v2 → 📱 iOS nativo (.ipa via EAS Build)
        (installabile,        (TestFlight / Ad-Hoc)
         0 €, no Mac)
```

- **v1 (ora):** PWA installabile via *"Aggiungi a Home"* — 0 €, nessun Mac, entrambi la usate subito.
- **v2 (opzionale):** vera app iOS dallo **stesso codice** (`eas build --platform ios`). Richiede Apple Developer (99 €/anno) solo per l'installazione stabile / TestFlight.

### Installazione iOS senza App Store (per la v2)

| Metodo | Costo | Durata build | Note |
|---|---|---|---|
| **TestFlight** *(consigliato)* | 99 €/anno | 90 giorni | Invito via email, app TestFlight |
| **Ad-Hoc** (IPA + UDID) | 99 €/anno | 1 anno | Device registrati per UDID |
| **AltStore / Sideloadly** | Gratis | 7 giorni | Ri-firma automatica, richiede PC |

---

## 🧱 Stack tecnico

| Livello | Tecnologia | Perché |
|---|---|---|
| **Frontend** | **Expo (React Native + react-native-web)** | Un codice → Web/PWA oggi, iOS nativo domani |
| **Backend / Auth / Dati** | **Supabase** (Postgres) | Login semplice, permessi per-utente, sharing via link, free tier |
| **Metadati film/serie** | **TMDB API** | Poster, anno, uscite, stagioni — gratis |
| **Hosting web** | **Azure Static Web Apps** | Deploy GitHub, HTTPS, preview e credito Visual Studio |
| **Notifiche** | Web Push (v1) / Push nativo (v2) | Reminder uscite e nuove stagioni |

Backend e metadati sono **agnostici** rispetto al frontend: non si riscrivono mai nel passaggio web → iOS.

---

## 🛠️ Sviluppo locale

```bash
npm install                       # dipendenze
copy .env.example .env.local      # (macOS/Linux: cp) poi inserisci la chiave TMDB
npm run web                       # avvia la web app su http://localhost:8081
npm run build                     # esporta il sito statico in dist/
```

### Chiave TMDB
La ricerca usa l'API gratuita di [TMDB](https://www.themoviedb.org/settings/api).
1. Crea un account e apri **Settings → API**
2. Copia l'**API Read Access Token** (v4)
3. Incollalo in `.env.local` come `EXPO_PUBLIC_TMDB_ACCESS_TOKEN=...`
4. Riavvia `npm run web`

> `.env.local` è ignorato da git: la chiave non viene mai committata.

### Database & login (Supabase)
Le liste personali e il login usano [Supabase](https://supabase.com) (free tier).
1. Crea un progetto su **supabase.com** (gratis)
2. Apri **SQL Editor** ed esegui i file in [`supabase/migrations/`](supabase/migrations)
   in ordine: `0001_init.sql`, `0002_episode_tracking.sql`, poi
   `0003_episode_viewings.sql`, `0004_internal_sharing.sql`,
   `0005_share_invites.sql`, `0006_watch_origins.sql` e
   `0007_movie_imports.sql`, quindi `0008_follower_profiles.sql` e
   `0009_followed_title_activity.sql`, infine
   `0010_watch_region_preference.sql`
3. In **Project Settings → API** copia *Project URL* e *anon public key*
4. Aggiungili in `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. *(Consigliato per 2 utenti)* **Authentication → Providers → Email**: disattiva "Confirm email" per accedere subito
6. Riavvia `npm run web`, registra i due account e salva i titoli dalla schermata **Cerca**

### Pubblicazione Azure

La PWA è pubblicata su
[`https://ashy-plant-0d5e71903.4.azurestaticapps.net`](https://ashy-plant-0d5e71903.4.azurestaticapps.net)
tramite Azure Static Web Apps (piano Free, West Europe).

Il workflow in [`.github/workflows/`](.github/workflows/) esegue `npm run build` e
pubblica `dist/` a ogni push su `main`. Richiede questi GitHub Actions secrets:

- `EXPO_PUBLIC_TMDB_ACCESS_TOKEN`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- deployment token Azure generato dalla risorsa Static Web Apps

Le variabili `EXPO_PUBLIC_*` sono incorporate nel bundle web. La chiave anon Supabase
è progettata per essere pubblica e protetta dalle policy RLS; il token TMDB verrà
spostato dietro un proxy Azure Function in una fase successiva.

---

## 🗃️ Modello dati

| Tabella | Contenuto | Note |
|---|---|---|
| `profiles` | Utenti | Estende `auth.users`; include il paese privato per “Dove guardarlo” |
| `titles` | Cache metadati TMDB | Condivisa; poster, durata, generi (per statistiche) |
| `library_items` | Titolo salvato da un utente | Stato, priorità e conteggio visioni film importate |
| `viewings` | Una riga per visione | Nota e voto **per singola visione** |
| `episode_watches` | Episodi visti (serie TV) | Tracking per episodio, origine registrata/importata |
| `episode_viewings` | Storico visioni episodi | Più visioni per episodio con data, nota e voto |
| `user_follows` | Contatti | Richieste one-way con accettazione |
| `title_shares` | Condivisioni interne | Titolo, messaggio, mittente, destinatario e lettura |
| `title_share_invites` | Inviti esterni | Token hashato, monouso e valido 7 giorni |

Sicurezza: **RLS** attiva ovunque — l’accesso diretto resta limitato ai propri dati.
RPC read-only con proiezioni esplicite permettono ai follower accettati di consultare
Libreria, Diario e attività dei titoli, senza email, UUID o timestamp interni. Schema completo in
[`supabase/migrations/`](supabase/migrations).

“Dove guardarlo” usa i dati regionali TMDB forniti da JustWatch. La disponibilità dei
titoli è salvata localmente per 24 ore, l’elenco paesi per 30 giorni; il refresh manuale
ignora la cache. Le categorie sono accordion esclusivi con anteprima di tre provider e
azione “Guarda tutte”. I dati non includono deep link ai singoli provider.

---

## 🚧 Roadmap

- [x] Definizione visione e funzionalità
- [x] Scelta stack tecnico (Expo + Supabase + TMDB)
- [x] Scaffold progetto Expo + PWA (tema ShowTime, logo, palette)
- [x] Integrazione TMDB — ricerca titoli + griglia poster
- [x] Schema dati Supabase (profiles, titles, library_items, viewings) + RLS
- [x] Login/registrazione (Supabase Auth)
- [x] Salvataggio titoli nelle liste (visto / da vedere / in corso)
- [x] Distinzione film / serie — film 2 stati, **serie con tracking per episodio**
- [x] Note e voto per singola visione di film ed episodi
- [x] TMDB — dettaglio titolo, uscite e nuove stagioni
- [x] Azioni Libreria nella scheda titolo + tracking/note inline per gli episodi
- [x] Statistiche (ore catalogate, generi, trend mensili e riepilogo degli ultimi 30 giorni)
- [x] Importazione storico senza contaminare trend e attività recente
- [x] Importazione film già visti, riclassificabile dalla UI, con ore separate dalla timeline
- [x] Home “living room” operativa
- [x] Navigazione web compatta con hamburger e logout
- [x] Condivisione singolo titolo via link
- [x] Contatti e condivisione interna con Inbox
- [x] Inviti da link esterno con consenso e contatto reciproco
- [x] Profili follower read-only con Libreria e Diario
- [x] Visioni e recensioni dei contatti nella scheda del titolo
- [x] “Dove guardarlo” per paese con provider TMDB/JustWatch e cache persistente
- [x] Centro reminder in-app per nuove stagioni / uscite entro 10 giorni
- [x] Diario delle visioni commentate o valutate
- [x] Calendario mensile delle prossime uscite TV
- [ ] Deploy web (Vercel) + test come PWA
- [ ] *(v2)* Build iOS nativa via EAS + TestFlight