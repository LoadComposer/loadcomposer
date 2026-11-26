# Distribuzione longitudinale sul pianale

Spike tecnico su LoadComposer v1.5.1. Baseline: commit
`5f5f606d25c171dc8fc9e47010254a585899b3e1`, tree
`af2a11b93a1504882a64c0fe96edc1c34ec6bd20`.

Dalla root del progetto:

```sh
npm ci
node tests/load-distribution-spike.mjs ../distribution-evidence
python3 experiments/load-distribution/plot.py ../distribution-evidence/layout-results.json
```

Il secondo comando esegue il core e i validatori originali tramite il
file standalone e l'harness JSDOM del repository. Ripete ogni esempio e
richiede esattamente lo stesso risultato. Il comando Python è opzionale e
richiede Matplotlib. Legge gli stessi rettangoli e strati del JSON,
in millimetri. Entrambi i comandi scrivono fuori dal repository.

## Contratto

`distribute(original, { rearReserveMm, validateGeometry, validateAdvanced })`
accetta un risultato canonico completo e validato. In Advanced richiede sia
il validatore generale sia quello per le pile. Restituisce un
testimone geometrico separato o `status: "no-alternative"` con la causa.
Se una riserva è richiesta e non è rispettata, la UI futura deve segnalare
il conflitto anche quando mostra il compatto come riferimento.
I testimoni hanno `computationVersion: null` e restano estranei alla
provenienza e alla stampa operativa v1.5.1.

Il motore raggruppa le posizioni a pavimento per impronte ammesse e numero
di pallet fisici. Una pila Advanced resta un blocco con gli stessi riferimenti,
stessi strati, altezza e vincoli. Una rotazione è ammissibile soltanto se
tutti gli strati possono assumere la nuova impronta e passare dalla porta.
Il motore enumera file trasversalmente compatibili e cerca una combinazione
che esaurisca esattamente l'inventario. Accosta le file dalla testata,
separate dal gioco richiesto, e centra ogni fila trasversalmente.

L'obiettivo principale è allungare la pianta entro la lunghezza disponibile
rispettando la riserva posteriore. A parità di lunghezza si preferiscono
meno file composte da una sola posizione. Fino a cinque ordinamenti del
miglior insieme di file sono confrontati per scarto quadratico dei pallet
equivalenti nelle cinque zone. Per la ricerca valgono limiti fissi di
60 posizioni, 8 profili, 8 posizioni per fila, 2.400 schemi grezzi e 300.000
transizioni. Il budget esaurito rimane visibile anche con un esito valido.
Si esplorano file, con bordi anteriori allineati entro ciascuna fila.
L'algoritmo non dimostra l'ottimo fra tutte le disposizioni rettangolari.
Un piano ammissibile per il solo vincolo di riserva può essere scelto
anche se il compatto originale, con una geometria diversa, è più lungo.

`measure` suddivide il pianale intero, inclusa l'eventuale riserva, in cinque
intervalli uguali. Somma l'area della proiezione al pavimento e ripartisce i
pallet fisici in proporzione all'intersezione longitudinale. Calcola la
media pesata delle ascisse dei centri, con massa relativa 1 per ogni pallet
fisico. Un callback di misura può attribuire masse diverse ai singoli
riferimenti di strato. La selezione attuale usa masse uguali.

I vuoti interni sono tratti longitudinali completamente liberi di almeno
600 mm e oltre il gioco. Le fasce laterali o tra corsie devono avere almeno
500 mm di larghezza e 600 mm di continuità e superare il gioco. Le fasce
adiacenti alla stessa sponda sono unite usando la larghezza comune. Tra
corsie si uniscono solo rettangoli allineati. Le soglie servono a esplorare
la rilevanza visiva dei vuoti. Non sono criteri di portata, assi o fissaggio.

## Passo successivo

Tre radio button con Compatta verso la motrice come valore iniziale.
Distribuita sul pianale chiede una candidata per il risultato corrente.
La riserva sarà un campo convertito in mm con interfaccia coerente con le
unità esistenti. Le zone e i vuoti appartengono alla scheda del piano
selezionato. Un'alternativa selezionata che in futuro dovrà essere stampata
richiederà un contratto esplicito con il job corrente, la preview e tutti i
gate di validazione e provenienza.

Prima di rendere la modalità disponibile, confrontare anche candidati più
corti ma trasversalmente più densi. Stabilire come esporre il compromesso
all'utente. Un eventuale avviso deve aggregare gli spazi significativi e
distinguere testata/coda/sponde del semirimorchio dal vano del container.
Testo proposto: «Spazio libero rilevante. Verifica con il vettore come
trattenere il carico.» La presenza o assenza dell'avviso è un dato
informativo, non una certificazione.

Ponderata per peso può riusare gli stessi riferimenti di pallet e strato,
con una funzione di massa per unità e un obiettivo dedicato. Un calcolo
dei carichi per asse richiederebbe dati specifici del mezzo e della tara.
Quick Entry è da rimuovere dalla roadmap alla prossima revisione
documentale, perché l'interfaccia dei gruppi copre già quel bisogno.
