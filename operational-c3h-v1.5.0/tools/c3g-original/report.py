import json,pathlib,datetime,hashlib
r=pathlib.Path(__file__).resolve().parents[1];out=r/'output';out.mkdir(exist_ok=True);load=lambda n:json.loads((r/'results'/n).read_text())
c=load('campaign.json');m=load('mixed-diagnostics.json');b=load('browser-independent.json');nb=load('benchmark-independent.json');bb=load('browser-benchmark-independent.json');cold=load('cold-process.json');runs=load('final-runs.json');integrity=load('final-integrity.json');scope=load('scope.json')
trip=lambda d:' / '.join(f'{d[k]:.2f}' for k in ['median','p95','max'])
node='\n'.join(f"| {p} | {trip(next(x for x in nb['summary'] if x['profile']==p and x['version']=='C3d')['total'])} | {trip(next(x for x in nb['summary'] if x['profile']==p and x['version']=='C3f')['total'])} |" for p in [x['id'] for x in nb['profiles']])
browser='\n'.join(f"| {p} | {mode} | {trip(next(x for x in bb['summary'] if x['profile']==p and x['mode']==mode and x['version']=='C3d')['total'])} | {trip(next(x for x in bb['summary'] if x['profile']==p and x['mode']==mode and x['version']=='C3f')['total'])} |" for p in [x['id'] for x in bb['profiles']] for mode in ['worker','fallback'])
runlines='\n'.join(f"| {x['name']} | {x['exit']} | {x['seconds']:.2f} |" for x in runs)
text=f'''# LoadComposer v1.5.0 — Independent Operational Verification C3g

**Verdetto: NO-GO.** C3f risolve le omissioni E01 originali e rivalida i mixed floor-only, ma rimane **G01-C3g: un carico divenuto parziale può conservare FITS e produrre istruzioni di stampa usando un precedente flag positivo**. Riprodotto con piano valido e conteggi coerenti, in single e mixed floor-only, su Chromium reale HTTP/file/ZIP, Worker/fallback/inline. Occorre correggere e verificare indipendentemente questo confine prima del passaggio a C4.

Verifica locale del 18–19 ottobre 2026 (Europe/Rome). Nessuna modifica alla produzione, deploy, pubblicazione o GitHub release. La geometria valida di un carico parziale non è un errore strutturale: il difetto consiste nella sua errata idoneità operativa. Non è stata dimostrata una produzione spontanea di questo stato da parte del solver sano; i controesempi modificano i risultati in memoria, come richiesto dall'incarico.

## Baseline e integrità

| Artefatto autorevole | SHA-256 verificato direttamente |
|---|---|
| Delivery C3f | `0e58f17afd2e9ebf955ac61ce8343c27f021858decb4ac538bf5a1ed8660c2c6` |
| QA C3f | `3c3c7b742747a8e995415c3369e6aaf016391102c912cff3878141f4546e02cf` |
| Standalone HTML C3f | `119225cbfc97305b816d92d357387bf27b1b75253a2b875a5da709c336e72c4e` |
| Standalone ZIP C3f | `396ff5f072936939b99158cc23319c472897a3a184b886bfc58f5962b895d0d3` |
| Delivery C3d | `0c418f38644563dba52e806583479f474f2867397066d0435a3fc2eaf26e7345` |
| Audit C3e originale | `21836dbb6aa1a3533bfe7deb9c0ee63e717088297d5fbca93dd4ec3914c8016e` |

Consultati hotfix, rapporto finale, verifica e manifesto C3f; letti rapporto e strumenti C3e conservati nel QA. CRC e percorsi degli archivi verificati. Manifesti: QA 2646 file, delivery C3f 336 checksum e 335 voci nel delivery manifest, standalone 5 file. I 162 file sorgente/build/script comuni controllati fra QA e delivery coincidono. HTML esterno, HTML nella delivery e HTML nello ZIP standalone coincidono. Il manifesto esterno C3f è verificato sui sette file referenziati.

Tutti gli originali ammessi sono ricontrollati byte-identici alla fine. Dopo build/test risultano invariati {integrity['sourceFiles']} file controllati di sorgenti, script, test e dipendenze dichiarate, inclusi {integrity['testFiles']} file del sottoalbero tests e {integrity['astraFixtureFiles']} fixture Astra. Gli strumenti originali C3e rieseguiti sono byte-identici all'archivio ammesso.

## Scope produttivo

Confronto diretto C3d/C3f: le sole tre funzioni HTML diverse sono `validateResultGeometry`, `validateAdvancedOperationalResult`, `validateMixedReference`. Sostituendo esattamente questi tre corpi, il restante HTML coincide byte per byte. Sweep, cache, generatore di capacità, solver single/mixed, ranking, mezzi, traduzioni, CSS e struttura preview/stampa restano invariati.

Advanced engine, validatore V-01, computation core, Worker, runtime e lockfile coincidono per SHA-256. Gli altri cambiamenti sono wiring/documentazione QA, esclusioni del packager, manifesti e output derivati standalone/download. Nessun ampliamento funzionale inatteso trovato. Il diff completo e gli hash sono in `results/scope.json` e `production.diff`.

## E01 e R01: risultati confermati

Il minimo E01 richiesto è riprodotto sulla C3d intatta: vano 2000×1000×2400, porta 1000×2400, due pallet 1000×1000×500, maxLayers 1; si conserva count=2 ma un solo rettangolo, materializedCount=1 e truncated=true. C3d: valid=true e stampa abilitata. C3f: errore strutturale e stampa bloccata.

Il replay browser C3e su C3d, 13 pallet 800×600×500 e omissione totale del piano caricato, genera realmente il documento operativo; l'HTML è conservato in `replay-C3d/loaded-omission-print.html`. Con C3f la stessa omissione non produce documenti. Le 124 mutazioni C3e passano da 12 accettazioni C3d a **zero accettazioni C3f**.

Il replay C3e invariato completa anche 24.325 confronti di separazione, 964 casi sani, 470 capacità troncate, 260 troncate a orientamenti misti, 191 parziali e 3 capacità zero, fino a 33.320.000 posizioni. Tutti i 964 witness ricevono FEASIBLE VERIFIED dal verificatore indipendente C3e; le prove dei suffissi usano formule di bande e separazione dal prefisso. Nessuna equivalenza con bestLayout viene presentata come prova di ottimalità universale. Cache: 45 contesti, espulsione/riuso e 18 ulteriori casi misti, senza differenze inattese.

Nuove prove C3g aggiungono 12 witness regolari, capacità 499/500/501/997/10.000/1.000.000, in entrambi gli orientamenti bloccati: rettangoli `(j,0,1,1)`, j da zero a n−1, integralmente contenuti e disgiunti. **FEASIBLE VERIFIED** per costruzione completa, anche senza materializzare il suffisso. Il carico richiesto di 13 rimane integralmente materializzato; la capacità oltre 500 può essere troncata. Queste famiglie sintetiche non costituiscono una valutazione logistica realistica né una prova universale del solver.

## G01-C3g — Idoneità operativa obsoleta dopo un cambiamento coerente

**Gravità: bloccante per il contratto di questo audit.** Il problema è riprodotto indipendentemente su C3d e C3f; non è attribuito come nuova regressione del solver C3f. È una lacuna residua del gate finale che la verifica C3g richiede di proteggere.

La rivalidazione esegue `result.ok = result.ok === true && result.validation.valid`. Un piano parziale legittimo può avere validation.valid=true, perché il validatore controlla geometria e coerenza. Il gate non ricalcola anche il completamento della richiesta. Se il precedente ok era true, rimane true; `isOperationalPrintAvailable` lo accetta. Il runtime all'arrivo calcola invece ok usando placedCount e quantità canonica, quindi distingue correttamente questi casi.

Riproduzione minima con due pallet, un solo pallet rimasto:

1. Calcolare un risultato sano e idoneo con lo stesso vano E01. Conservare input e container.
2. Mixed floor-only: spostare il secondo rettangolo in unplaced; portare count, materializedCount, placedCount, floorCapacity e totalCapacity a 1; aggiornare inviluppi, allPlaced=false e fitsQtyBySpace=false.
3. Single: conservare un rettangolo e una voce stackCounts; riconciliare i conteggi caricati e una capacità completa valida da una posizione, oltre a requiredLayers=2, requiredStackHeight=1000 e motivo max-layers. Nessuna ottimalità viene richiesta al piano di capacità completo alternativo.
4. Non riscrivere ok, validation, input o container: il successo precedente è sufficiente.
5. Chiamare il validatore e il gate finale. Atteso: geometria valida, risultato parziale non FITS e stampa non disponibile. Osservato: valid=true, ok=true, stampa disponibile.

`tools/counterexample.mjs` e `results/G01-minimal.json` contengono input, risultato sano, risultato alterato, atteso e osservato. Il caso mixed non richiede alcuna capacità teorica single; dimostra separatamente il problema della decisione operativa.

Nel browser il piano passa da 13 a 12 pallet con Worker/fallback e da 2 a 1 inline. Le **18 combinazioni C3f** (tre percorsi × tre modalità × due famiglie) generano effettivamente il documento. La tabella può mostrare insieme **FITS**, **PARTIAL** e un pallet non collocato. I documenti `G01-C3f-*.html` sono generati dal percorso originale di stampa, dopo i gate e la creazione dello schema. Non è soltanto una verifica di un booleano. Il problema resta osservabile durante i cicli di lingua, vista laterale/rampa e B/N.

Raccomandazione, senza implementazione: il gate deve ricostruire l'idoneità operativa dai conteggi correnti e dalla richiesta canonica, oltre alla validità geometrica, preservando i carichi parziali come risultati strutturalmente sani. Aggiungere il controesempio ai gate single, mixed floor-only e al riesame delle modalità Advanced. Non occorre riaprire il solver o C1A1626.

## Nuove prove indipendenti C3g

| Campagna | Esecuzione e risultato |
|---|---|
| Single sani | **720**, xorshift32 seed **0xC3A71869**: 310 completi, 156 parziali, 254 vuoti; 47 multilivello, 143 capacità troncate. Nessun errore strutturale inatteso, nessuna differenza del producer C3d/C3f. |
| Determinismo | 43 ripetizioni selezionate dei nuovi single: risultati identici. |
| Mutazioni single negative | **432**, tutte rifiutate: omissioni, riconteggi parziali incoerenti, duplicati/overlap, orientamenti/indici, stack, inviluppi, alias, NaN/Infinity/zero/frazioni, input 501, alterazioni simultanee capacità/carico. |
| Riduzioni coerenti parziali | 40 mixed più una single: validità geometrica preservata, **41 gate erroneamente positivi** G01. Questi casi non vengono conteggiati come geometrie invalide. |
| Modalità mixed | 80 configurazioni sane fra omogeneo/delegato, floor-only, Advanced con pile reali, Advanced senza pile, partial; **320 mutazioni rifiutate** al gate. Nessuna divergenza semantica C3d/C3f, esclusi i soli tempi diagnostici Ms dal confronto. |
| Diagnostica lazy | **189 confronti** su sette lingue, tre giri in ordini diversi: riferimenti validi, gruppo/progressivo invalidi, NaN, duplicato, ID errato, unplaced. Codici e messaggi uguali a C3d; nessuna valutazione dell'etichetta per il riferimento sano. |
| Arrivo Worker/fallback | **12 scenari**: sano utilizzabile, omissione rifiutata, partial coerente valido ma non stampabile, anche con ok=true nel payload. |
| Browser nuovi post-validazione | **24 scenari**, sei C3d e 18 C3f; controllo sano, omissione, riduzione coerente, sette lingue/vista/B/N, input modificato, reset e ricalcolo. |
| Browser sani aggiuntivi | **10 scenari**, 120 righe e 80 cambi filtro: partial-500, zero, accesso single/mixed, vere pile Advanced. Stampano solo le righe idonee non alterate; 12 righe conservate. |

Il verificatore single indipendente controlla intervalli di ogni coppia di rettangoli, dimensioni/orientamenti, indici, inviluppi, somma degli stack, strati fisici/canonici e riconciliazione dei conteggi. Usa input nuovi, non soltanto asserzioni dei test C3f. Gli strumenti del prodotto vengono usati per produrre e validare il risultato sotto esame; harness, launcher e setup UI forniti sono infrastruttura riutilizzata, non oracolo indipendente.

## Browser, input correnti e regressioni

Browser realmente eseguito: **Chromium {bb['browser']}, Linux headless nativo**. HTTP statico locale, HTML da file e ZIP standalone estratto; file/ZIP offline prima della navigazione. Worker reale, Worker non disponibile con fallback e percorso inline. JSDOM è usato per i test Node e non contato come browser. Nessun Firefox, Edge, Chrome separato, dispositivo mobile fisico o stampante fisica certificato.

Le modifiche agli input bloccano la stampa obsoleta; il nuovo calcolo resta utilizzabile. Il test silenzioso cambia il valore prima dell'evento, così il controllo finale può rilevare input diversi. Un input event può ricalcolare legittimamente subito nel percorso inline: questo comportamento è distinto da un riuso obsoleto. Dopo reset non vengono riutilizzate le righe alterate. Nei controlli sani, selezione e filtri conservano l'idoneità per singolo mezzo. Il fatto che due profili di accesso abbiano nove righe OK è un dato osservato, non un valore imposto agli altri profili.

La suite C3f originale viene rieseguita separatamente dai test nuovi, con build e npm test. Include F01–F04, R01/E01, V-01/V-02, 17 controesempi Astra e cinque riduzioni, H-03 originale/ridotto, C1G, geometria storica, 99/120/500, quantità 501, sette lingue, preview/stampa e offline. I due controlli release opzionali di ammissione/storia v1.4 sono tentati esplicitamente ma richiedono la delivery v1.4 approvata e la variabile LOADCOMPOSER_V140_ROOT, non fornite per questa verifica. I loro exit non-zero sono un limite di prerequisiti, distinto dal PASS di npm test, dalla regressione geometrica storica e dal difetto G01. Non è dichiarata una nuova certificazione integrale della storia file v1.4. La suite Worker è ripetuta ulteriormente due volte. Le scadenze lunghe sono provate con **orologio Chromium simulato**, costanti di prodotto invariate; nessuna nuova attesa reale di 120 secondi viene rivendicata. Il fallback resta non preinterrompibile all'interno di un solve sincrono.

L'installazione da QA estratto non usa copie manuali dalla delivery. Il primo npm ci offline fallisce ENOTCACHED per xmlchars; npm ci ordinario installa le 58 dipendenze dichiarate. Non si dichiara autonomia offline di npm senza cache. I log finali completi prevalgono sul primo log parziale della suite.

| Esecuzione finale | Exit | Secondi |
|---|---:|---:|
{runlines}

Le suite del manutentore possono terminare PASS mentre G01 rimane presente: i loro casi negativi non verificano la transizione coerente da completo a parziale mantenendo il vecchio stato operativo.

## Prestazioni sullo stesso ambiente

Node {nb['host']['node']}, {nb['host']['cpu']}, Linux x64; stesso ambiente C3d/C3f. Benchmark finali senza altre suite QA in parallelo. Ordine delle versioni alternato, nessun campione escluso. **192 campioni Node**: sei profili × 16 × due versioni, sempre 12 mezzi. I raw separano producer, validazione generale e gate. I profili Node mixed-floor usano gli stessi footprint del benchmark browser e non sono equiparati al diverso profilo Node eterogeneo del rapporto C3f.

Valori in millisecondi: **mediana / P95 / massimo**, nearest-rank. Con n=16 e n=9 P95 coincide con massimo: la coda statistica è poco stimata.

| Profilo Node, totale 12 mezzi | C3d | C3f |
|---|---:|---:|
{node}

**216 campioni Chromium**: sei profili × nove × due versioni × Worker/fallback. Setup UI escluso; tempo reale dal calculate alla conclusione e al rendering del job. I risultati per mezzo coincidono fra versioni in tutti i campioni.

| Profilo browser | Modalità | C3d | C3f |
|---|---|---:|---:|
{browser}

Mixed-floor-99: mediana **91,3→137,2 ms Worker (+45,9)** e **112,9→150,3 ms fallback (+37,4)**. Il rendering cresce da circa 10–11 a 41–42 ms, coerente con i gate che rivalidano durante la UI. Il costo è reale e motivato; non è corretto eliminarlo rinunciando alla validazione. Da solo non costituisce motivo del NO-GO.

Truncated-13 rimane nella stessa fascia. Deep-500 non presenta il forte incremento antecedente alla formattazione lazy. Il probe input su mixed-floor è 1→2 ms Worker e 2→3 ms fallback come mediana. Deep-500 conserva long task: massimi C3f 115 ms Worker e 242 ms fallback; probe input massimo 107/83 ms. Sono osservazioni puntuali, non garanzie di preemption o latenza peggiore.

Cache fredda: 24 finestre Node nel processo iniziale, poi validazione ripetuta. Mediane prima validazione C3d/C3f 4,49/4,58 ms; ripetute 1,15/1,17 ms. Conservato un picco C3f **167,95 ms**, senza attribuirlo automaticamente alla cache o al GC. L'indagine aggiuntiva usa **24 processi Node separati**: prima validazione C3d **{trip(cold['summary'][0]['first'])}**, C3f **{trip(cold['summary'][1]['first'])}** ms. Il picco iniziale non viene eliminato dai raw; l'evidenza non dimostra un nuovo costo ricorrente di 168 ms del validatore.

Le snapshot heap misurano solo JS della pagina, senza GC forzato né memoria dei Worker. Deep-500 C3f fallback mostra mediana circa 63 MB e massimo 113 MB prima del GC, contro circa 50/51 MB C3d. Questo dato non certifica un leak né equivalenza di memoria; va tenuto distinto dalla durata. Nessuna nuova struttura persistente è introdotta dalle tre funzioni. Tutti i job benchmark terminano con zero Worker e URL attivi.

## Limiti, tentativi e decisione

La copertura è mirata, non universale. Nessuna ottimalità dell'euristica, certificazione di stabilità fisica/peso o garanzia di assenza di leak. C1A1626 non è stato riaperto. I risultati originali C3e e C3f rieseguiti sono distinti dai nuovi input C3g. Il loro GO/PASS riguarda le loro suite, non sostituisce il verdetto di questa revisione.

Conservati i tentativi diagnostici: cache npm mancante; primo confronto Advanced che includeva impropriamente i tempi Ms, corretto mantenendo tutti i campi semantici; prima asserzione browser che scambiava il ricalcolo inline da evento con riuso obsoleto, sostituita dalla prova silenziosa prima dell'evento. Nessuna modifica produttiva per ottenere un PASS.

| Area | Giudizio nelle prove completate |
|---|---|
| Integrità geometrica dei piani E01 | Confermata la correzione originale; nessuna omissione strutturale accettata nelle nuove prove negative |
| Capacità teoriche R01 | Preservate, complete e troncate; distinzione witness/ottimalità rispettata |
| Risultati sani e qualità euristica | Nessuna regressione osservata; solver e ranking invariati |
| Gate finale single/mixed | **FAIL G01: idoneità e stampa obsolete su partial coerenti** |
| Asincrono e arrivo risposte | Nessun nuovo difetto nelle prove; deadline lunghe simulate |
| Prestazioni | Overhead mixed motivato e contenuto; picchi e limiti riportati |
| Offline e packaging | Verificati nei percorsi eseguiti; npm offline dipende dalla cache |

**NO-GO per C3f nell'ambito C3g.** E01 è corretto nella forma originale, ma G01 impedisce di chiudere il requisito operativo. Richiesta una correzione circoscritta del gate e nuova verifica indipendente prima di C4. Nessuna autorizzazione alla pubblicazione è implicita.
'''
(out/'INDEPENDENT_OPERATIONAL_VERIFICATION-C3g-v1.5.0.md').write_text(text)
print('Report written',len(text.encode()))
