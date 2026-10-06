# Badge ShowTime — proposta e piano

Documento collaborativo per progettare il sistema di badge di ShowTime.

Questa proposta affianca, senza sostituirla, la prima raccolta di idee in
[`BADGE.md`](./BADGE.md).

## Stato

- **Fase:** implementazione
- **Implementazione:** Batch A1, Archivista (A2.1) e Nostalgico (A2.2) pubblicati e
  verificati in produzione
- **Obiettivo:** arrivare a un catalogo V1 piccolo, misurabile e sostenibile
- **Principio guida:** premiare il percorso personale, non la quantità di tempo
  trascorsa davanti allo schermo
- **Nomi:** proposta approvata
- **Soglie:** valori cumulativi moltiplicati almeno ×5 e arrotondati per eccesso

---

## 1. Principi di prodotto

### 1.1 Badge misurabili

Ogni badge deve avere:

- una regola verificabile con i dati disponibili;
- una soglia esplicita;
- una fonte dati identificabile;
- un comportamento definito per storico importato e attività reale;
- una versione della regola.

Da evitare definizioni soggettive come:

- attore “emergente”;
- attore “storico”;
- titolo “di tendenza” senza una fotografia storica della popolarità;
- filmografia “completa” destinata a cambiare nel tempo.

### 1.2 Importazioni e attività reali

Lo storico importato può contribuire ai badge di:

- catalogo;
- quantità;
- generi;
- decenni;
- attori e registi;
- titoli completati.

Solo le attività `tracked`, con una data reale, possono contribuire ai badge di:

- maratona;
- binge;
- rewatch;
- Diario;
- condivisione;
- tempestività rispetto all’uscita;
- frequenza nel tempo.

### 1.3 Badge permanenti

Un badge sbloccato non viene revocato se:

- cambia la filmografia TMDB;
- cambia il voto medio di un titolo;
- un titolo viene rimosso dalla Libreria;
- viene modificata una regola in una versione futura.

Al momento dello sblocco devono essere memorizzati:

- badge e livello;
- data di sblocco;
- versione della regola;
- progresso raggiunto;
- fotografia minima dei dati che hanno motivato lo sblocco.

### 1.4 Progressione invece di duplicazione

Le soglie simili appartengono alla stessa famiglia.

Esempio:

| Famiglia | Bronzo | Argento | Oro | Platino |
|---|---:|---:|---:|---:|
| Cinefilo | 50 film | 250 film | 500 film | 1.500 film |
| Serialista | 25 serie | 100 serie | 250 serie | 500 serie |
| Critico | 50 commenti | 150 commenti | 250 commenti | 500 commenti |

La UI mostra il livello corrente e il progresso verso il successivo, per esempio
`420 / 500`.

### 1.5 Politica delle soglie

Decisione del 5 ottobre 2026:

- le soglie cumulative vengono moltiplicate almeno per 5;
- il risultato viene arrotondato verso l’alto a un numero leggibile;
- i requisiti strutturali restano invariati.

Per questa revisione sono stati usati come riferimenti:

- multipli di 5 sotto 100;
- multipli di 50 tra 100 e 999;
- multipli di 500 da 1.000 in su.

Esempi:

- `10 × 5 = 50`;
- `25 × 5 = 125`, arrotondato a `150`;
- `250 × 5 = 1.250`, arrotondato a `1.500`.

Non vengono moltiplicati:

- numero di generi o decenni;
- episodi consecutivi necessari per definire un binge;
- durata della finestra temporale;
- ampiezza minima di una stagione;
- numero di opere necessario a definire una coppia attore + regista;
- requisiti che descrivono la struttura del badge e non il suo progresso.

### 1.6 Incentivi responsabili

Non vengono premiati:

- perdita di sonno;
- utilizzo compulsivo quotidiano;
- commenti artificialmente lunghi;
- invio massivo di condivisioni;
- consumo indiscriminato di contenuti.

Il sistema non deve suggerire che guardare di più sia sempre meglio.

---

## 2. Categorie

1. **Catalogo** — quantità e varietà della Libreria
2. **Visione** — completamenti, maratone e rewatch
3. **Diario** — note e valutazioni
4. **Social** — consigli realmente letti
5. **Persone** — attori, attrici e registi
6. **Esplorazione** — generi, epoche e percorsi cinematografici

---

## 3. Catalogo V1 proposto

La prima versione contiene tre badge introduttivi e dieci famiglie a livelli.

### 3.0 Badge introduttivi

Questi badge non hanno livelli e forniscono un primo feedback prima delle soglie
cumulative più alte.

#### Primo ciak

Prima attività di visione reale registrata in ShowTime:

- visione film;
- episodio `tracked` o revisione episodio;
- visione completa di una serie.

Lo storico importato non conta.

#### Prima recensione

Prima voce del Diario con una nota testuale non vuota:

- film;
- episodio;
- visione completa serie.

Un’attività con solo voto non conta.

#### Stagione chiusa

Prima stagione con tutti gli episodi completati.

- Sono validi sia progresso importato sia attività reale.
- La stagione deve contenere almeno un episodio.
- La Stagione 0 / Speciali è esclusa.
- Lo sblocco è permanente se TMDB aggiunge o corregge episodi successivamente.

### 3.1 Cinefilo

Completa film.

| Livello | Requisito |
|---|---:|
| Bronzo | 50 film |
| Argento | 250 film |
| Oro | 500 film |
| Platino | 1.500 film |

- Include storico importato.
- Un film conta una volta, indipendentemente dal numero di rewatch.

### 3.2 Serialista

Completa serie TV.

| Livello | Requisito |
|---|---:|
| Bronzo | 25 serie |
| Argento | 100 serie |
| Oro | 250 serie |
| Platino | 500 serie |

- Include storico importato.
- Conta soltanto serie con stato TMDB `Ended`.
- Tutti gli episodi catalogati devono risultare visti.
- Serie in corso, pianificate o cancellate non contribuiscono.
- Lo sblocco resta permanente se TMDB modifica successivamente i metadati.

### 3.3 Archivista

Costruisce una Libreria ampia.

| Livello | Requisito |
|---|---:|
| Bronzo | 500 titoli |
| Argento | 1.500 titoli |
| Oro | 2.500 titoli |
| Platino | 5.000 titoli |

- Include tutti gli stati e lo storico importato.
- Film e serie contano allo stesso modo.

### 3.4 Nostalgico

Completa titoli usciti prima del 1990.

| Livello | Requisito |
|---|---:|
| Bronzo | 50 titoli |
| Argento | 150 titoli |
| Oro | 250 titoli |
| Platino | 500 titoli |

- Include film e serie.
- Include storico importato.
- Evoluzione possibile: badge separato per titoli precedenti al 1970.

### 3.5 Esploratore di generi

Completa titoli appartenenti a generi differenti.

| Livello | Requisito |
|---|---:|
| Bronzo | 5 generi |
| Argento | 8 generi |
| Oro | 12 generi |
| Platino | 15 generi |

- Include storico importato.
- Usa una lista canonica ShowTime condivisa tra film e serie.
- Generi equivalenti TMDB vengono accorpati nella stessa categoria.
- La lista e la mappatura definitiva devono coprire tutti i generi TMDB rilevanti.
- Un titolo contribuisce una volta a ogni categoria canonica associata.

### 3.6 Ancora un episodio

Completa più episodi della stessa serie nella stessa data.

| Livello | Requisito |
|---|---:|
| Bronzo | 3 episodi |
| Argento | 5 episodi |
| Oro | 8 episodi |
| Platino | 12 episodi |

- Solo attività `tracked`.
- Gli episodi devono appartenere alla stessa serie.
- Le spunte importate non contano.

### 3.7 Maratoneta

Completa rapidamente una stagione di almeno 8 episodi.

Proposta V1:

- stagione da almeno 8 episodi;
- tutti gli episodi completati nello stesso giorno o in due giorni consecutivi;
- solo attività `tracked`.
- l’ordine di registrazione degli episodi non è rilevante;
- l’intera stagione deve rientrare nella stessa finestra di una o due date.

Il requisito “entro 48 ore” viene evitato finché ShowTime non registra l’orario reale
della visione.

### 3.8 Encore

Rivede titoli già completati.

| Livello | Requisito |
|---|---:|
| Bronzo | 5 titoli diversi rivisti |
| Argento | 25 titoli diversi rivisti |
| Oro | 100 titoli diversi rivisti |
| Platino | 250 titoli diversi rivisti |

Fonti:

- storico visioni film;
- storico visioni complete serie;
- storico visioni episodio, per una futura variante specifica.

Un titolo conta come rivisto quando:

- ha almeno due visioni complete `tracked`; oppure
- ha una visione completa importata e almeno una nuova visione `tracked`.

Due visioni soltanto importate non contano.

Per le serie, la prima visione importata richiede che tutti gli episodi della serie
risultino completati come storico importato; il rewatch viene registrato nello storico
`series_viewings`.

### 3.9 Critico

Scrive commenti nel Diario.

| Livello | Requisito |
|---|---:|
| Bronzo | 50 commenti |
| Argento | 150 commenti |
| Oro | 250 commenti |
| Platino | 500 commenti |

- Conta soltanto note testuali non vuote.
- Film, episodi e visioni complete serie sono validi.
- Ogni voce distinta del Diario conta, incluse revisioni e rewatch.
- Modificare una voce esistente non incrementa il progresso.
- Eliminare una voce può ridurre il progresso corrente, ma non revoca livelli sbloccati.
- La lunghezza del commento non influisce.

### 3.10 Passaparola

Condivide titoli che vengono effettivamente letti.

| Livello | Requisito |
|---|---:|
| Bronzo | 25 titoli distinti letti |
| Argento | 100 titoli distinti letti |
| Oro | 250 titoli distinti letti |
| Platino | 500 titoli distinti letti |

- Conta soltanto condivisioni con `read_at`.
- Lo stesso titolo conta una sola volta per destinatario.
- La chiave logica è `titolo + destinatario`.
- Conta al primo `read_at`; reinvii e riaperture non incrementano il progresso.
- Gli invii non letti non contano, per evitare spam.

---

## 4. Catalogo V2 — Persone e percorsi

Questa fase richiede una cache persistente dei crediti TMDB. Non è sostenibile
ricalcolare tutto interrogando centinaia di endpoint a ogni apertura.

### 4.1 Volto familiare

Completa opere con lo stesso interprete.

| Livello | Requisito |
|---|---:|
| Bronzo | 15 titoli |
| Argento | 50 titoli |
| Oro | 75 titoli |
| Platino | 150 titoli |

- Film e serie sono validi.
- Un titolo conta una sola volta.
- Sono escluse le apparizioni come “Self”.

### 4.2 Occhio d’autore

Completa opere dirette dalla stessa persona.

| Livello | Requisito |
|---|---:|
| Bronzo | 15 titoli |
| Argento | 40 titoli |
| Oro | 75 titoli |
| Platino | 150 titoli |

### 4.3 Coppia d’oro

Completa almeno 3 titoli con la stessa coppia interprete + regista.

- Il titolo deve includere entrambi nei crediti TMDB.
- Ogni coppia può generare un badge distinto.

### 4.4 Attraverso le epoche

Completa titoli dello stesso interprete in almeno 3 decenni differenti.

Esempio: anni ’90, 2000 e 2010.

### 4.5 Camaleonte

Completa titoli dello stesso interprete appartenenti ad almeno 3 generi distinti.

- Richiede normalizzazione dei generi.

| Livello | Requisito |
|---|---:|
| Bronzo | 3 generi |
| Argento | 5 generi |
| Oro | 8 generi |
| Platino | 12 generi |

### 4.6 Evoluzione d’autore

Completa almeno 5 opere dello stesso regista distribuite su almeno 15 anni.

Sostituisce il requisito fragile di guardare la filmografia in ordine cronologico.

---

## 5. Badge opzionali successivi

### Prima fila

Completa 25 episodi entro 7 giorni dalla loro pubblicazione.

- Solo attività `tracked`.
- Richiede date TMDB affidabili.

### Fuori dal coro

Assegna voto personale almeno 8 a 25 titoli con:

- voto TMDB inferiore a 6,5;
- almeno 100 voti TMDB, per evitare valori poco rappresentativi.

La fotografia del voto TMDB deve essere salvata al momento dello sblocco.

### Viaggiatore nel tempo

Completa almeno un titolo in 5 decenni differenti.

### Giro del mondo

Completa titoli provenienti da 10 paesi o lingue differenti.

Richiede l’aggiunta persistente di lingua e paese d’origine ai metadati.

---

## 6. Badge rinviati o rimossi

### Night Watcher

**Rinviato.**

ShowTime conosce la data registrata, non l’orario reale della visione. Inoltre non è
opportuno premiare esplicitamente la visione notturna.

### Trend Setter

**Rinviato.**

Richiederebbe uno storico giornaliero della popolarità TMDB. Il valore corrente non
permette di dimostrare che il titolo non fosse popolare al momento della visione.

### ShowTime Elite / streak giornaliera

**Rimosso dalla V1.**

Una sequenza di aperture giornaliere incentiva utilizzo compulsivo e può essere ottenuta
senza attività significativa.

Possibile alternativa futura:

- attività reale in 4 settimane differenti e consecutive;
- nessun obbligo quotidiano.

### Completionist di una filmografia

**Sostituito da soglie fisse.**

Le filmografie:

- crescono nel tempo;
- includono cameo e crediti marginali;
- possono contenere centinaia di opere;
- possono cambiare su TMDB.

### Attore emergente / storico

**Rimosso.**

Le definizioni sono soggettive e difficili da mantenere in modo consistente.

---

## 7. Modello dati proposto

### Definizione dei badge

Tabella proposta: `badge_definitions`

| Campo | Scopo |
|---|---|
| `id` | Identificatore stabile, per esempio `cinephile` |
| `version` | Versione della regola |
| `category` | Catalogo, Visione, Diario, Social, Persone, Esplorazione |
| `name` | Nome localizzato |
| `description` | Requisito leggibile |
| `icon` | Identificatore dell’illustrazione |
| `is_active` | Regola disponibile |

I livelli sono normalizzati in `badge_levels`:

| Campo | Scopo |
|---|---|
| `badge_id` / `badge_version` | Famiglia e versione |
| `level` | Ordine numerico 1–4 |
| `level_key` | Bronzo, Argento, Oro, Platino |
| `name` / `description` | Testi localizzati del livello |
| `threshold` | Soglia numerica |
| `icon_key` | Variante illustrata della patch |

I badge introduttivi restano singoli nell’esperienza utente. Per riusare gli stessi
vincoli, RPC e meccanismi di idempotenza, vengono rappresentati internamente da un unico
livello tecnico (`level = 1`, soglia `1`), senza mostrare Bronzo o altre graduazioni.

Le regole non dovrebbero essere salvate come SQL arbitrario nel database. L’engine
applicativo associa ogni `id/version` a una funzione tipizzata.

Decisione:

- `badge_definitions` è la fonte ufficiale versionata di nomi, descrizioni, categorie,
  livelli e soglie;
- il registro TypeScript è la fonte ufficiale della logica di valutazione;
- il registro e i valutatori vengono eseguiti in una Supabase Edge Function fidata;
- il client Expo può richiedere la valutazione e leggere il proprio stato, ma non può
  scrivere progressi o sblocchi;
- soltanto la Edge Function usa il service role per invocare le funzioni di persistenza;
- il database non contiene SQL o espressioni arbitrarie eseguibili;
- una definition senza valutatore compatibile genera un errore esplicito e non uno
  sblocco approssimativo.

### Sblocchi utente

Tabella proposta: `user_badges`

| Campo | Scopo |
|---|---|
| `user_id` | Proprietario |
| `badge_id` | Famiglia badge |
| `badge_version` | Versione della regola |
| `level` | Livello sbloccato |
| `unlocked_at` | Data e ora |
| `progress_at_unlock` | Valore raggiunto |
| `evidence` | Snapshot JSON minimo della prova |

Vincolo proposto:

`unique (user_id, badge_id, level)`

`evidence` contiene esclusivamente:

- conteggio raggiunto;
- data della valutazione;
- versione della regola;
- ID degli elementi determinanti, quando necessari.

Non contiene mai:

- note o recensioni;
- messaggi Inbox;
- testo delle condivisioni;
- altri contenuti personali.

### Progresso

Tabella V1: `user_badge_progress`

Il progresso viene materializzato fin dalla prima versione per supportare:

- caricamento rapido della Sala trofei;
- massimo storico non regressivo;
- riconciliazione e diagnostica;
- notifiche di avanzamento senza ricalcoli completi in UI.

| Campo | Scopo |
|---|---|
| `user_id` | Proprietario |
| `badge_id` | Famiglia |
| `progress` | Valore corrente |
| `max_progress` | Massimo storico raggiunto e mostrato in UI |
| `next_threshold` | Prossima soglia |
| `evaluated_at` | Ultimo ricalcolo |
| `rule_version` | Versione applicata |

Il progresso mostrato all’utente è sempre `max_progress`:

- non arretra dopo la rimozione di titoli o attività;
- non revoca livelli già sbloccati;
- il progresso corrente può essere ricalcolato internamente per diagnostica;
- reinserire lo stesso elemento non genera progresso aggiuntivo se la regola usa ID
  distinti.

---

## 8. Badge engine

Ogni valutatore restituisce:

```ts
type BadgeEvaluation = {
  badgeId: string;
  version: number;
  progress: number;
  unlockedLevels: number[];
  evidence: Record<string, unknown>;
};
```

Esempi di fonti:

| Famiglia | Tabelle principali |
|---|---|
| Primo ciak | `viewings`, `episode_watches`, `episode_viewings`, `series_viewings` |
| Prima recensione | note non vuote in `viewings`, `episode_viewings`, `series_viewings` |
| Stagione chiusa | `episode_watches` + conteggio episodi TMDB verificato dalla Edge Function |
| Cinefilo | `library_items`, `titles` |
| Serialista | `library_items`, `episode_watches`, `titles` |
| Archivista | `library_items` |
| Nostalgico | `library_items`, `titles` |
| Generi | `library_items`, `titles.genres` |
| Binge / Maratoneta | `episode_watches` con `source = tracked` |
| Encore | `viewings`, `series_viewings`, `episode_viewings` |
| Critico | `viewings`, `episode_viewings`, `series_viewings` |
| Passaparola | `title_shares` con `read_at` |

### Quando valutare

Decisione:

1. dopo ogni mutazione rilevante, in modo non bloccante;
2. all’apertura della Sala trofei, come riconciliazione completa;
3. tramite ricalcolo completo dopo una modifica delle regole.

Non valutare tutti i badge a ogni render.

Se la valutazione fallisce:

- la mutazione principale resta valida;
- l’errore viene registrato esplicitamente;
- non viene restituito uno sblocco approssimativo;
- il calcolo viene riprovato alla successiva mutazione rilevante o riconciliazione.

### Primo rilascio e backfill

Al primo avvio del sistema badge:

- viene valutato tutto lo storico esistente;
- vengono sbloccati retroattivamente tutti i livelli già meritati;
- `unlocked_at` usa la data reale del backfill, senza inventare date passate;
- l’evidenza viene marcata come `backfill`;
- l’utente riceve un unico riepilogo aggregato;
- non vengono riprodotte animazioni o notifiche per ogni singolo badge.

### Idempotenza

Lo sblocco deve essere idempotente:

- la stessa azione può invocare l’engine più volte;
- il vincolo univoco impedisce duplicati;
- la notifica viene mostrata solo quando viene inserito un nuovo sblocco.

---

## 9. Esperienza utente

### Sala trofei

Nuova pagina personale con:

- riepilogo badge sbloccati;
- categorie;
- famiglie con livello corrente;
- progresso verso il livello successivo;
- tutti i badge bloccati con requisito leggibile;
- prossimo livello raggiungibile evidenziato per ogni famiglia;
- livelli bloccati successivi visibili ma attenuati;
- data di sblocco;
- livello e progresso raggiunto al momento dello sblocco.

Accesso V1:

- voce dedicata **Sala trofei** nel menu globale;
- indicatore numerico o dot per nuovi sblocchi non ancora visitati;
- l’indicatore viene azzerato aprendo la Sala trofei;
- nessuna sezione permanente aggiuntiva in Home o Statistiche.

La UI non mostra i titoli o le attività che hanno completato il requisito.
L’evidenza tecnica minima resta privata nel database soltanto per audit e diagnostica.

### Sblocco

- toast/banner breve e discreto;
- icona della patch, nome del badge e livello raggiunto;
- tap sul banner apre la Sala trofei;
- nessun blocco della navigazione;
- una notifica per famiglia/livello;
- se una singola azione sblocca più badge, mostra un unico banner aggregato con il
  numero totale;
- possibilità di rivedere lo sblocco nella Sala trofei.

### Direzione visuale

- patch cinematografiche illustrate;
- simboli originali e immediatamente riconoscibili;
- palette ShowTime blu, viola e arancio su fondo living-room;
- variazioni coerenti per i livelli della stessa famiglia;
- niente poster compositi o artwork TMDB incorporati.

### Profilo follower

Ogni utente può scegliere fino a 3 badge sbloccati da mettere in evidenza.
I badge selezionati sono visibili a tutti i follower accettati, con le stesse regole di
accesso già usate per Libreria e Diario.

Da mantenere privati:

- progresso dei badge non sbloccati;
- metriche grezze;
- orari e pattern comportamentali;
- evidenze dettagliate non necessarie.

### Nessuna classifica globale nella V1

Motivazioni:

- cataloghi importati di dimensioni differenti;
- rischio di premiare consumo eccessivo;
- riduzione della componente personale;
- maggiore complessità di moderazione e privacy.

---

## 10. Piano di implementazione

### Fase 0 — Decisioni

- [x] Confermare nomi italiani delle famiglie
- [x] Confermare soglie V1
- [x] Definire generi canonici
- [x] Definire cosa significa serie completata
- [x] Definire evidenze minime da conservare
- [x] Scegliere icone e direzione visuale

### Fase 1 — Fondazioni

- [x] Migration `badge_definitions` e `badge_levels`
- [x] Migration `user_badges` e `user_badge_progress`
- [x] RLS e funzioni di lettura/sblocco
- [x] Tipi TypeScript
- [x] Registry dei valutatori versionati
- [x] Supabase Edge Function autenticata
- [x] Persistenza riservata al `service_role`
- [x] Test unitari e SQL di idempotenza

### Fase 2 — Prima verticale

Implementare **Cinefilo** end-to-end con i livelli 50 / 250 / 500 / 1.500.

Asset:

- creare subito la patch definitiva di Cinefilo;
- validarne leggibilità, stile e variazioni di livello;
- usare la patch approvata come riferimento per tutte le altre famiglie.

- [x] Calcolo progresso Cinefilo nel backend
- [x] Sblocco livelli idempotente nel backend
- [x] Persistenza progresso corrente e massimo
- [x] Banner globale aggregato
- [x] Sala trofei minima
- [x] Menu globale e indicatore unseen
- [x] Profilo mobile 360/390 px
- [x] Test con storico importato

Questa fase valida architettura e UX prima di aggiungere altre regole.

### Verifica Fase 1

- account `@testshowtime`;
- 3 film completati rilevati;
- progresso Cinefilo `3 / 50`;
- quattro livelli catalogati: Bronzo, Argento, Oro e Platino;
- seconda valutazione senza nuovi sblocchi;
- scrittura diretta client su `user_badge_progress` bloccata da RLS (`403`);
- evidence tecnica non presente nella risposta HTTP;
- test SQL transazionale a progresso 500:
  - Bronzo, Argento e Oro sbloccati;
  - seconda valutazione senza duplicati;
  - progresso corrente ridotto a 3 e massimo storico mantenuto a 500;
  - prossima soglia 1.500;
  - `ROLLBACK` finale senza dati simulati persistenti.

### Verifica verticale Cinefilo

- route `/badges` operativa;
- patch illustrate Bronzo, Argento, Oro e Platino;
- account `@testshowtime`: `0/4` livelli, progresso massimo `3/50`;
- Bronzo evidenziato come prossimo livello;
- refresh idempotente senza nuovi sblocchi;
- menu globale con voce Sala trofei;
- indicatore unseen collegato alle RPC;
- banner globale aggregato collegato agli eventi di sblocco;
- backfill automatico dopo il login se manca una valutazione;
- trigger non bloccante dopo mutazioni Libreria;
- test reversibile Matrix:
  - cambio `Visto → Da vedere`;
  - progresso corrente `3 → 2`, massimo storico fermo a `3`;
  - ripristino `Visto`;
  - progresso corrente e massimo `3`;
- nessuna visione aggiunta o dato di test residuo;
- layout senza overflow a 360 e 390 px.

### Fase 3 — Catalogo V1

#### Batch A — Fondazioni catalogo

- [x] Primo ciak
- [x] Prima recensione
- [x] Stagione chiusa
- [ ] Serialista
- [x] Archivista
- [x] Nostalgico

### Verifica Batch A1 — badge introduttivi

- migration `0017_introductory_badges.sql` con tre definizioni versionate;
- livello tecnico unico a soglia `1`, non mostrato come livello in UI;
- Primo ciak basato solo su attività reali, senza storico importato;
- Prima recensione basata su note testuali non vuote, senza salvare il testo
  nell’evidenza;
- Stagione chiusa verificata server-side contro TMDB, includendo episodi importati ma
  escludendo Stagione 0 / Speciali;
- short-circuit sui badge già sbloccati per rispettarne la permanenza ed evitare richieste
  TMDB successive non necessarie;
- persistenza avviata solo dopo aver caricato e validato i fatti di tutti i badge richiesti,
  evitando sblocchi parziali in caso di errore TMDB;
- backfill login esteso a tutte le definizioni attive non ancora valutate;
- rivalutazioni non bloccanti collegate alle mutazioni film, episodi e visioni complete;
- Sala trofei generalizzata a `7` traguardi, con sezione Prime tappe e tre patch originali;
- `13/13` test engine, typecheck e lint mirato superati;
- secret `TMDB_ACCESS_TOKEN` configurato e nuova Edge Function distribuita;
- migration applicata: `3` definizioni, `3` livelli tecnici e nessun residuo del test SQL;
- test SQL transazionale: uno sblocco per badge, rivalutazione senza duplicati,
  regressione corrente a `0`, massimo storico `1` e rollback finale;
- account `@testshowtime`: backfill reale con `3` nuovi badge, seconda richiesta
  concorrente e refresh manuale con `0` nuovi sblocchi;
- Sala trofei reale `3/7`, banner aggregato, date di sblocco e layout senza overflow a
  360/390 px;
- corretto il markup web del banner separando il pulsante principale dalla chiusura:
  nessun errore console dopo il nuovo backfill.
- gruppi Prime tappe e Cinefilo trasformati in accordion con conteggi `3/3` e `0/4`;
  sono chiusi di default e si aprono automaticamente quando contengono nuovi sblocchi;
- banner reso completamente opaco con superficie `#1C2038`, per non confondersi con il
  contenuto sottostante.

Per la Edge Function è richiesto uno dei secret Supabase
`TMDB_ACCESS_TOKEN` / `TMDB_API_KEY`; sono accettati anche i nomi Expo equivalenti già
usati dal progetto.

### Verifica Batch A2.1 — Archivista

- migration `0019_archivist_badge.sql` con soglie `500 / 1.500 / 2.500 / 5.000`;
- conteggio di ogni voce distinta della Libreria, indipendentemente da stato o tipo media;
- fact loader paginato oltre 1.000 righe;
- evidenza privata limitata a conteggio, versione e data già aggiunti dalla RPC, senza
  duplicare migliaia di ID nel JSON;
- rivalutazione non bloccante soltanto dopo aggiunta o rimozione dalla Libreria;
- massimo storico e sblocchi permanenti gestiti dalla RPC condivisa;
- patch originale a schedario nelle varianti Bronzo, Argento, Oro e Platino;
- Cinefilo mantenuto prima di Archivista nell’ordine della Sala trofei;
- preview locale: `Archivista 0/4`, progresso `5/500`, hero `3/11`;
- patch e accordion verificati senza overflow a 360 e 390 px;
- `16/16` test engine superati;
- test SQL transazionale pronto per soglia `1.500`, idempotenza e regressione a `5`.
- Edge Function distribuita prima dell’attivazione del catalogo;
- deploy Azure completato sul commit `f50cc38`;
- migration `0019_archivist_badge.sql` applicata e testo UTF-8 verificato;
- test SQL transazionale superato senza dati residui;
- account `@testshowtime`: `5/500`, refresh idempotente e hero `3/11`;
- account principale: `360/500`, refresh idempotente e hero `4/11`;
- produzione senza errori console né overflow a 360/390 px.

### Verifica Batch A2.2 — Nostalgico

- migration `0020_nostalgic_badge.sql` con soglie `50 / 150 / 250 / 500`;
- conta film e serie nello stato `Visto` con anno TMDB valido precedente al 1990;
- include storico importato;
- esclude il 1990, anni mancanti, `0000` e valori non formati da quattro cifre;
- helper puro e testato per il confine temporale;
- loader paginato oltre 1.000 titoli completati;
- rivalutazioni non bloccanti dopo cambi di stato film e progresso serie;
- evidenza privata limitata a conteggio, versione e data;
- patch originale a televisore CRT nelle quattro varianti metalliche;
- ordine Sala trofei: Cinefilo, Archivista, Nostalgico;
- preview locale: `Nostalgico 0/4`, progresso `0/50`, hero `3/15`;
- patch e accordion verificati senza overflow a 360 e 390 px;
- `20/20` test engine superati;
- test SQL transazionale pronto per soglia `150`, idempotenza e regressione a `0`.
- Edge Function monolitica verificata e distribuita con loader ed evaluator Nostalgico;
- primo tentativo di backfill fermato esplicitamente con `409 facts_loader_not_found`
  prima di qualsiasi persistenza; artifact corretto e ridistribuito;
- deploy Azure completato sul commit `226db27`;
- migration `0020_nostalgic_badge.sql` applicata con encoding UTF-8;
- test SQL transazionale superato senza dati residui;
- account `@testshowtime`: `0/50`, refresh idempotente e hero `3/15`;
- account principale: `32/50`, refresh idempotente e hero `4/15`;
- produzione senza errori console né overflow a 360/390 px.

#### Batch B — Esplorazione e comportamento

- [ ] Esploratore di generi
- [ ] Ancora un episodio
- [ ] Maratoneta
- [ ] Encore

#### Batch C — Diario e Social

- [ ] Critico
- [ ] Passaparola

### Fase 4 — Profilo e rifiniture

- [ ] Selezione di 1–3 badge pubblici
- [ ] Badge in evidenza sul profilo follower
- [ ] Accessibilità
- [ ] Localizzazione testi
- [ ] Telemetria errori dell’engine
- [ ] Riconciliazione completa

### Fase 5 — Crediti TMDB

- [ ] Cache persistente dei crediti persona/titolo
- [ ] Volto familiare
- [ ] Occhio d’autore
- [ ] Coppia d’oro
- [ ] Attraverso le epoche
- [ ] Camaleonte
- [ ] Evoluzione d’autore

---

## 11. Criteri di accettazione V1

- Ogni badge ha una regola deterministica e versionata.
- Importato e tracked sono trattati secondo le regole dichiarate.
- Gli sblocchi sono permanenti e idempotenti.
- Nessun badge viene duplicato.
- Il progresso mostrato corrisponde ai dati reali.
- Il sistema non altera Libreria, Diario o Statistiche.
- Un errore di valutazione non blocca la mutazione principale.
- La Sala trofei funziona a 390 px senza overflow.
- RLS impedisce di leggere badge privati di altri utenti.
- Le superfici follower espongono solo badge scelti dall’utente.

---

## 12. Decisioni V1 confermate

### Nomi

- [x] Nomi italiani della proposta approvati
- [x] “Ancora un episodio”
- [x] “Volto familiare”
- [x] “Occhio d’autore”
- [x] “Coppia d’oro”

### Soglie

- [x] Soglie cumulative moltiplicate almeno ×5
- [x] Arrotondamento per eccesso a numeri leggibili
- [x] Requisiti strutturali lasciati invariati
- [x] Livelli Bronzo, Argento, Oro e Platino
- [x] Tutte le famiglie a progressione arrivano a Platino
- [x] Maratoneta accetta lo stesso giorno o due date consecutive
- [x] Critico conta tutte le voci distinte con nota, incluse revisioni e rewatch

### Badge introduttivi

- [x] Primo ciak
- [x] Prima recensione
- [x] Stagione chiusa
- [x] Badge singoli, senza livelli
- [x] Stagione 0 / Speciali esclusa da Stagione chiusa

### Serie completata

- [x] Stato TMDB `Ended`
- [x] Tutti gli episodi catalogati risultano visti
- [x] Storico importato valido per il progresso
- [x] Sblocco permanente anche dopo modifiche ai metadati TMDB

### Generi canonici

- [x] Un’unica tassonomia ShowTime per Film e Serie TV
- [x] Generi TMDB equivalenti accorpati
- [x] Confermate 15 categorie canoniche
- [x] Un titolo può contribuire a più categorie, una volta per categoria

| Genere ShowTime | Generi TMDB inclusi |
|---|---|
| Azione e avventura | Action, Adventure, Action & Adventure |
| Animazione | Animation |
| Commedia | Comedy |
| Crime | Crime |
| Documentario e news | Documentary, News |
| Dramma e soap | Drama, Soap |
| Famiglia e ragazzi | Family, Kids |
| Fantascienza e fantasy | Science Fiction, Fantasy, Sci-Fi & Fantasy |
| Horror | Horror |
| Mistero e thriller | Mystery, Thriller |
| Romance | Romance |
| Storia, guerra e politica | History, War, War & Politics |
| Musica | Music |
| Reality e talk | Reality, Talk |
| Western | Western |

`TV Movie` non contribuisce direttamente: descrive il formato distributivo, non il
genere narrativo. Gli altri generi associati allo stesso titolo restano validi.

### Social

- [x] Fino a 3 badge pubblici scelti dall’utente
- [x] Badge pubblici visibili a tutti i follower accettati
- [x] Progresso, badge bloccati ed evidenze restano privati
- [x] Passaparola conta una sola volta per coppia titolo + destinatario
- [x] Reinvii e riaperture non incrementano il progresso

### UX

- [x] Mostrare tutti i badge bloccati
- [x] Evidenziare il prossimo livello di ogni famiglia
- [x] Mostrare attenuati i livelli successivi
- [x] Patch cinematografiche illustrate con simboli originali
- [x] Palette ShowTime blu, viola e arancio
- [x] Escludere poster compositi e artwork TMDB
- [x] Mostrare soltanto data, livello e progresso raggiunto
- [x] Non mostrare titoli o attività usati come prova
- [x] Gruppi badge espandibili con conteggio sbloccati/totali
- [x] Gruppi chiusi di default e apertura automatica per nuovi sblocchi
- [x] Banner di sblocco con sfondo pieno, senza trasparenza

### Operatività

- [x] Definizioni versionate nel database e valutatori tipizzati nel codice
- [x] Badge engine fidato in Supabase Edge Function TypeScript
- [x] Client Expo senza permessi di scrittura su progressi e sblocchi
- [x] Progresso corrente e massimo persistiti in `user_badge_progress`
- [x] Valutazione non bloccante dopo ogni mutazione rilevante
- [x] Riconciliazione completa aprendo la Sala trofei
- [x] Backfill retroattivo completo con un unico riepilogo
- [x] Progresso massimo storico, mai regressivo in UI
- [x] Toast/banner discreto per gli sblocchi live
- [x] Banner aggregato quando una singola azione sblocca più badge
- [x] Evidenza minima senza testi o contenuti personali
- [x] Prima verticale end-to-end: Cinefilo
- [x] Sala trofei nel menu globale con indicatore nuovi sblocchi
- [x] Prima patch definitiva: Cinefilo
- [x] Seconda famiglia progressiva: Archivista
- [x] Terza famiglia progressiva: Nostalgico
- [x] Primo batch successivo: introduttivi, Serialista, Archivista e Nostalgico

---

## 13. Prossimo passo consigliato

Le decisioni di prodotto necessarie per la V1 sono chiuse.

Il prossimo passo operativo è **Serialista**:

1. considerare soltanto serie TMDB con stato `Ended`;
2. verificare tutti gli episodi regolari, escludendo Stagione 0 / Speciali;
3. includere progresso importato e attività reale;
4. aggiungere le soglie `25 / 100 / 250 / 500`;
5. creare patch e accordion dedicati;
6. completare il Batch A2 con backfill e test reali.
