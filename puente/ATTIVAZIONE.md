# PUENTE — Attivazione risposte in tempo reale

Questa cartella su GitHub Pages è pubblicata, ma fino a configurazione completata opera in **modalità demo**. Non raccoglie risposte da smartphone diversi.

## 1. Collega un progetto Firebase

1. Apri https://console.firebase.google.com/ e crea un progetto (oppure usa un progetto esistente dedicato all'attività).
2. Nella panoramica del progetto, registra una **app Web**. Copia i parametri pubblici `apiKey`, `authDomain`, `projectId`, `appId`.
3. Apri **Build → Authentication → Sign-in method** e abilita l'accesso **Anonymous**. In *Settings → Authorized domains* controlla che `darioscordari-ux.github.io` sia autorizzato.
4. Apri **Build → Realtime Database**, crea un database (possibilmente in una regione europea) e copia `databaseURL`.
5. Nella scheda **Rules** del database incolla il contenuto del file `database.rules.json` presente in questa cartella. **Non usare le regole temporanee di test che consentono lettura/scrittura a chiunque.** Pubblica le regole.

## 2. Collega PUENTE al tuo database

Modifica **solo** `puente/config.js` nel repository GitHub, inserendo i parametri della Web app nella struttura già presente. Non inserire password, token di amministratore o chiavi private: quei parametri sono la normale configurazione pubblica di una Web app Firebase. La sicurezza dipende dalle regole del database.

L'indirizzo del progetto è:
https://darioscordari-ux.github.io/itinerario-artistico/puente/

Attendi che il workflow GitHub Pages completi la pubblicazione. Aprendo la pagina iniziale, il messaggio deve indicare **Modalità live disponibile**: se compare **Modalità demo**, la configurazione non è completa o Firebase non è accessibile.

## 3. Prova obbligatoria con due dispositivi diversi

1. Apri PUENTE dal telefono **A** e scegli **Avvia come docente**. Conserva il link/codice della stanza.
2. Dal PC della LIM apri il link **Vista LIM**, oppure l'app → **Collega LIM** e inserisci il codice.
3. Dal telefono **B**, in un altro browser/dispositivo, scansiona il QR della LIM, scegli un gruppo e invia 3 risposte.
4. Verifica che le tre parole compaiano sulla LIM e che il telefono A visualizzi un partecipante in più.
5. Dal telefono A tocca una parola e verifica che si apra la scheda fotografica sulla LIM. Prova **Chiudi risposte**, **Riapri risposte**, **Prossima manche**.
6. Ripeti sulla rete dati mobile per verificare che non dipenda dalla Wi-Fi scolastica.

## Avvertenze tecniche

- La **regia** è associata all'account anonimo del browser/dispositivo che ha creato la stanza. Se cancelli i dati del sito o cambi browser non puoi automaticamente riprendere la stessa regia.
- Il QR usa un codice stanza, non una credenziale segreta. Gli studenti non devono inviare dati personali, fotografie di persone, nomi o informazioni riservate.
- La LIM è **sola visualizzazione**: è il telefono docente a gestire avanzamento, blocco delle risposte e schede fotografiche.
- Le risposte sono memorizzate nel database: al termine della lezione cancella la stanza da Firebase se non vuoi conservare i dati.
- Le fotografie da Wikimedia Commons richiedono Internet; verificarne in anticipo alcune e non presupporre che siano tutte sempre disponibili.
- La configurazione non avviene automaticamente caricando questi file su GitHub: è indispensabile autorizzare/creare il progetto Firebase.

## Stato di preparazione

- Pubblicazione statica GitHub Pages: predisposta.
- Regia docente, vista LIM, QR e simulazione: predisposti.
- File regole RTDB: predisposto, **da applicare nel progetto Firebase**.
- Connessione Firebase: **da completare**.
