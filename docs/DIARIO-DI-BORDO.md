# 🧭 Diario di bordo — ShowTime

Registro cronologico delle **decisioni** e dei **progressi** del progetto, così da non perdere nulla.
Documento vivo: aggiornato a ogni passo di lavoro.

> Ultimo aggiornamento: 2026-09-29 (azioni per stagione)

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

## 6. Prossimi passi (backlog)

- [ ] Note e voto per singola visione (UI su `viewings`)
- [ ] Dettaglio titolo TMDB (trama, uscite, nuove stagioni)
- [ ] Statistiche (ore viste, generi, trend mensili)
- [ ] Prototipo UI "living room" per la Home
- [ ] Condivisione lista via link privato
- [ ] Reminder nuove stagioni / uscite
- [ ] Deploy web su Vercel + test PWA
- [ ] *(v2)* Build iOS nativa via EAS + TestFlight
