from pathlib import Path
import json,hashlib,math,datetime,shutil
b=Path('c3b');w=b/'work';qa=w/'functional-c3b-v1.5.0';out=b/'output'
def read(p):return json.loads(p.read_text())
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def quant(v):
 v=sorted(v);return [v[math.ceil(len(v)*p)-1] for p in [.5,.95,1]]
def fmt(v):return ' / '.join(f'{x:.2f}' for x in v)
gates=read(b/'results/clean-gates.json');assert gates['status']=='PASS' and len(gates['rows'])==2
proof=read(b/'results/package-proof.json');scope=read(b/'results/scope.json');geometry=read(qa/'results/geometry-summary.json');oracle=read(qa/'results/oracle-summary.json');perf=read(qa/'results/performance-summary.json');browser=read(qa/'results/browser-performance.json');access=read(qa/'results/access-performance.json');life=read(qa/'results/lifecycle.json');wall=read(qa/'results/worker-wallclock.json');contracts=read(qa/'results/contracts.json');worker=read(qa/'results/worker.json');functionalBrowser=read(qa/'results/browser.json');mutations=read(qa/'results/validator-mutations.json');admission=read(b/'custody/admission.json')
assert geometry['completed']==10000 and oracle['completed']==2200 and oracle['exact']==2200
assert all(s['acceptedInvalid']==0 and s['qualityDifferences']==0 and s['layoutDifferences']==0 for s in [geometry,oracle])
assert geometry['subjectSHA256']==oracle['subjectSHA256']==perf['subject']==proof['subjectSHA256']
orows=[json.loads(line) for line in (qa/'results/oracle-rows.jsonl').read_text().splitlines()];assert all(row['tuple'][:2]==[row['oracle']['placed'],row['oracle']['floor']] for row in orows if row['independent']['valid'])
assert len((qa/'results/performance-rows.jsonl').read_text().splitlines())==perf['samples']==1020
assert scope['allFrozenPartsUnchanged'] and all(p['rankingEqual'] for p in perf['profiles'])
node_table=[]
for p in perf['profiles']:
 v=p['versions'];node_table.append(f"| {p['id']} | {fmt(list(v['C2']['solverMs'].values()))} | {fmt(list(v['C3b']['solverMs'].values()))} | {fmt(list(v['C3b']['totalMs'].values()))} |")
browser_table=[]
for version,protocol in [('C2','offline'),('C3b','offline'),('C3b','http'),('C2','fallback'),('C3b','fallback')]:
 rows=[r for r in browser['rows'] if r['version']==version and r['protocol']==protocol];keys=[r['keyDelayMs'] for r in rows if r['keyDelayMs'] is not None];browser_table.append(f"| {version} {protocol} | {fmt(quant([r['totalMs'] for r in rows]))} | {fmt(quant([r['maxLongTask'] for r in rows]))} | {fmt(quant(keys)) if keys else 'non misurato'} |")
access_table=[]
for n in [12,13,31]:
 for fallback in [False,True]:
  vs=[]
  for v in ['C2','C3b']:
   rows=[r for r in access['rows'] if r['quantity']==n and r['fallback']==fallback and r['version']==v];vs.append(fmt(quant([r['ms'] for r in rows])))
  access_table.append(f"| {n} | {'fallback' if fallback else 'Worker/inline'} | {vs[0]} | {vs[1]} |")
p01=next(p for p in perf['profiles'] if p['id']=='deep-500')['versions'];cancels=[r['cancelCommandMs'] for r in life['rows'] if r['cancelCommandMs'] is not None];recalc=[r['recalculateWaitMs'] for r in life['rows']];report=out/'FUNCTIONAL_HOTFIX-C3b-v1.5.0.md';changed='\n'.join('- `'+p+'`' for p in scope['changedOriginalDeliveryFiles']);hash_table='\n'.join(f"| {p['filename']} | {p['bytes']:,} | `{p['sha256']}` |" for p in proof['files']);gate_table='\n'.join(f"| {r['index']} | {r['manifestFilesVerified']} | {r['stages'][0]['exit']} / {r['stages'][0]['seconds']:.2f} s | {r['stages'][1]['exit']} / {r['stages'][1]['seconds']:.2f} s | {r['contracts']} / {r['browserCases']} / {r['workerCases']} |" for r in gates['rows'])
text=f'''# LoadComposer v1.5.0 — C3b Functional Correctness & Async Reliability Hotfix

{datetime.date.today().isoformat()} — **FUNCTIONAL PASS** nei gate completati. C2 e audit C3 originali preservati. Nessun deploy, pubblicazione o GitHub release. È richiesta una successiva verifica indipendente dei fix, poi C4 e approvazione manuale. Questo esito non equivale a RELEASE-READY e non modifica retroattivamente il NO-GO della C2 nell'audit C3.

## 1. Baseline e scope

Unica base di implementazione: C2 PERFORMANCE PASS. Verificati tutti i quattro SHA-256 richiesti e il CRC degli ZIP. Archivio QA C3 SHA `27bf0cc0acd0c105ef32c68f41e5f5fcb7fe899a37fe2bdfe2e648e8aa5fa4be`, manifesto interno, rapporto e verifica esterna anch'essi verificati. C1b è usata soltanto come confronto di comportamento.

I componenti congelati risultano byte-identici alla C2: engine Advanced (SHA `978878099a535179b209446401fcecf9aeb6d18b6836662663aa9d504a6bb047`), validatore V-01 (SHA `2f0e1733b0f1dd4ed57eed3fecf219cba68916daa5b698bb8906dae48e65ac4a`), computation-core, helper geometrici, producer single/mixed, ranking, dati dei mezzi e CSS. I valori delle traduzioni esistenti sono identici; è aggiunta soltanto `compute.timeout` nelle sette lingue. `package-lock.json` e dipendenze sono invariati.

C1A1626 resta 10 pallet / 7 floor, verificato da regressione permanente. Non è stato affrontato né migliorato in C3b. Nessun nuovo vincolo di peso, stabilità o bilanciamento.

## 2. F01 — Contratto single riconciliato con l'input canonico

**Causa:** il validatore usava `result.layers` per derivare capacità, conteggi e pile senza dimostrare che il valore rispettasse stacking/max layers dell'input canonico. Una risposta internamente coerente ma calcolata con massimo 2 poteva quindi superare il limite canonico 1 ed essere stampata.

**Correzione:** il validatore ricava `canonicalLayers` dall'altezza interna, altezza pallet, gap verticale, stacking abilitato/disabilitato e massimo canonico. `layers` e `availableLayers` devono descrivere la capacità disponibile; `loadLayers` e `stackCount` descrivono il carico effettivo e possono essere inferiori. Vengono riconciliati capacità teorica a pavimento, materializzazione/troncamento, orientamenti, estensioni, bound necessario di area, floor richiesti/usati, pallet collocati/non collocati, strati richiesti, altezza richiesta e motivo del limite. Il piano realmente caricato continua a passare i controlli di geometria, orientamento, accesso, conteggio e altezza cumulata.

Il risultato deve avere la stessa modalità del contesto normalizzato. La risposta Worker continua a non poter fornire propri input/container/validazioni: si riassocia il contesto corrente. Il gate operativo ora ricontrolla anche i single e invalida flag positivi obsoleti prima di tabella, preview e stampa. Non si cambiano quantità, coordinate, strati o metadati per far passare una risposta: il validatore resta in sola lettura, mentre il consumatore aggiorna lo stato di validità.

**Replay:** minimo C3 da 2 pallet rifiutato, mentre la C2 lo accetta; il test ripristina soltanto l'alias `layout === loadLayout` perso dalla serializzazione JSON, non modifica i metadati errati. Il caso da 13 pallet è provato in HTTP, HTML offline e ZIP estratto, con Worker nativo e fallback. Le risposte alterate falliscono chiuse: zero righe operative, zero stampa e zero stato positivo per il risultato invalido. Sono provati massimi 1/2/3, capacità fisica inferiore al massimo, stacking off e alterazioni di capacità/layer/stackCount/altezza/gap/input.

## 3. F02 — Inidoneità per mezzo distinta dagli errori di layout

**Causa:** il confine operativo trasformava qualsiasi errore del validatore Advanced in errore interno. `INDIVIDUAL_ACCESS_FAILURE` su un solo mezzo provocava l'annullamento dell'intero job asincrono, compreso il fallback.

**Correzione:** V-01 resta invariato e restituisce ancora tutte le sue evidenze. Il consumatore distingue l'accesso individuale non consentito dalle incoerenze strutturali. Gestisce come inidoneità anche l'altezza interna insufficiente per un singolo pallet, soltanto quando il riepilogo di altezza corrisponde esattamente alla somma canonica e la pila eccedente contiene una sola unità. Pile multilivello oltre l'altezza, altezze dichiarate errate, stock/riferimenti/copie/coordinate incoerenti restano errori interni. Accesso insufficiente combinato con un difetto strutturale non viene assorbito nella categoria operativa.

Un mezzo inidoneo ha `ok=false` e validità operativa negativa, rimane visibile e non è stampabile. Il job pubblica la tabella solo dopo tutte le 12 risposte riconciliate. Risposte mancanti, incomplete o associate al job errato continuano a fallire globalmente senza pubblicare parziali.

**Replay:** i casi 12/13/31 con gruppo A 1×1200×800×2300 e gruppo B restante ×1200×800×500 producono **12 righe e 9 mezzi utilizzabili** in tutte le forme e nel fallback. Per 99/500 unità e pallet alti 3000 mm si confronta la reale capacità dei mezzi, senza pretendere artificiosamente nove OK: le righe restano 12 e coincidono con i producer sincroni. Confrontati C1b e producer sincrono C2 sui casi documentati e sulle varianti; quantità/floor/stato dei mezzi corrispondono. La stampa dei mezzi idonei è conservata e quella dei non idonei è sempre bloccata.

## 4. F03 — Avvio, avanzamento e completamento

Il timeout di avvio C2 era cancellato su ready senza un limite successivo. La nuova politica è esplicita:

- Avvio entro 5 s; in caso di mancato ready o errore di runtime è possibile un solo passaggio al fallback.
- Dopo ready: massimo **120 s senza avanzamento valido** e **15 minuti complessivi** per il job Worker.
- Il Worker invia l'avvio del prossimo mezzo, poi il risultato. Un segnale è ammesso una sola volta per l'indice atteso; heartbeat ripetuti non prolungano arbitrariamente la scadenza.
- Alla scadenza: errore localizzato, Worker terminato, URL revocato, timer puliti, nessun parziale pubblicato, stampa disabilitata. Nessun loop automatico di retry/fallback; Reset o un nuovo calcolo sono disponibili.

Il limite di inattività è molto maggiore dei costi difficili misurati. Un solve sincrono dentro il Worker non può dimostrare il proprio avanzamento a ogni istante: la politica limita l'attesa, non prova matematicamente che un calcolo sia bloccato. Un singolo solve valido che superasse 120 s verrebbe segnalato come timeout. Il fallback non può preinterrompere una chiamata sincrona sul main thread; questo limite rimane documentato.

Prove con Chromium/Worker nativi: mancato ready, pronto funzionante, pronto silenzioso, sei minuti di avanzamento valido, scadenza totale non eludibile, errori dopo risultati parziali, reset/modifica input in attesa, messaggio obsoleto dopo il nuovo job, cinque cicli timeout/riprova e verifica risorse. I casi da 6 e 15 minuti usano avanzamento dell'orologio Chromium con costanti del prodotto invariate; non sono minuti reali di CPU. Una prova separata con orologio reale termina dopo **{wall['durationMs']/1000:.2f} s**, con zero righe e risorse pulite.

## 5. F04 e stabilità del QA

Il test bundle precedente includeva solo il documento API sotto `docs/`, omettendo gli altri input della delivery; il build tentava di scrivere glossari in un percorso assente. Il packager ora include l'intero albero `docs/`. Il QA finale contiene sorgenti, test, fixture, documentazione richiesta e lockfile; non richiede copie manuali dalla delivery o dagli originali per `npm test`.

Il primo tentativo di installazione `--offline` a cache fredda è fallito per ENOTCACHED. Una normale installazione pinned è riuscita e le due directory finali installano autonomamente da cache con `npm ci --offline`; questo non va confuso con il difetto di file mancanti nel QA. Per un ambiente senza cache è documentato `npm ci` con accesso al registry.

Un tentativo di confezionamento ha rilevato un temporaneo dell'output QA scomparso durante la scansione della delivery. L'output di confezionamento può ora stare fuori sorgente, e i nomi temporanei noti di quell'output non sono trattati come input della delivery. Entrambi i nuovi confezionamenti successivi sono identici; il tentativo fallito è conservato nei log.

L'asserzione temporizzata di `computation-v1.5.0.mjs` è sostituita da una sincronizzazione sul Worker nativo: si trattiene la richiesta, si verifica pending/stampa disabilitata dopo lingua/tema, si aspetta la richiesta della versione successiva, poi la si rilascia. Non si indebolisce l'asserzione per accettare un risultato incompleto. La suite viene ripetuta in due estrazioni pulite consecutive, in isolamento.

| Estrazione | File verificati dal manifesto | Install exit / durata | Suite exit / durata | Contratto / browser / Worker |
|---|---:|---:|---:|---:|
{gate_table}

I log completi di queste due prove finali sono incorporati nella verifica JSON separata, per poter congelare l'archivio prima di provarlo senza introdurre un riferimento circolare ai propri log. Le evidenze QA precedenti, i risultati dei test mirati e tutti i tentativi registrati sono nel test bundle. Le directory erano nuove, senza node_modules; non sono stati aggiunti file mancanti dopo un fallimento della suite.

## 6. Campagne e regressioni

| Prova | Completate | Esito |
|---|---:|---|
| Geometria nuova, seed `0xC3B51017` | {geometry['completed']:,} | {geometry['valid']:,} validi, {geometry['operationalRejections']} rifiuti operativi; zero invalidi accettati |
| Oracolo, seed `0xC3B51018` | {oracle['completed']:,} | {oracle['exact']:,} EXACT sulle prime due priorità; zero gap nei risultati validi |
| Contratti single/accesso | {len(contracts['rows'])} | PASS, inclusi errori di accesso combinati con incoerenze |
| Scenari browser mirati | {len(functionalBrowser['rows'])} | HTTP/HTML/ZIP, Worker/fallback, gate preview/stampa |
| Politica Worker | {len(worker['rows'])} + 1 reale | PASS, deadline, recupero, versioni e risorse |
| Alterazioni Astra del validatore | 40 + 7 probe epsilon | Nessun invalido accettato fra le alterazioni |

Le campagne finali registrano l'hash esatto dell'HTML `{proof['subjectSHA256']}`. Input e righe JSONL sono completi. I primi tentativi delle campagne, precedenti all'ultimo rafforzamento single, sono etichettati preliminari e non sommati al totale finale. Il primo benchmark conservava un file raw parziale pur avendo il summary completo: è stato ripetuto con scrittura finale atomica; la consegna contiene tutti i **1.020 campioni raw** del benchmark finale.

Il confronto C2/C3b riguarda tutte le sette chiavi e gli interi floor/stack, non il solo totale. Zero differenze di layout e ranking su 10.000+2.200 casi. Sono giustificati {geometry['operationalDeltas']} cambi di classificazione nella campagna geometrica e {oracle['operationalDeltas']} in quella piccola: inidoneità individuali precedentemente marcate interne, mantenute non operative. Non sono promosse a layout validi.

L'oracolo indipendente prova collocati e floor nei propri domini interi; nessun run interrotto è chiamato EXACT. Il confronto a sette chiavi preserva il ranking C2, senza dimostrare un ottimo universale. I checker sono indipendenti dalla produzione; l'engine rimane euristico.

Le due suite complete passano i 17 controesempi euristici e 5 riduzioni, H-03 10/7 e ridotto 7/7, C1G00034, V-01/V-02 (57 casi, sei replay), 42 casi browser localizzati/1.512 combinazioni bloccate/12 stampe valide, 7.542 geometrie storiche senza regressioni, 35/35 parità funzionale, 99/120, single/mixed/Advanced, ammissione 500 e rifiuto 501, sette lingue, B/N, responsive, preview e trasporto stampa. C1A1626 resta verificato 10/7.

## 7. Benchmark sullo stesso ambiente

Node {perf['node']}, {perf['cpu']}, Linux. 17 profili × 30 campioni × 2 versioni = {perf['samples']} misure; versioni alternate, nessun warmup escluso. Mediana/P95/massimo nearest-rank. Solver, validazione e totale sono separati nei raw; checker indipendente fuori misura. Tutti i ranking sono deterministici e uguali tra versioni.

Valori ms, mediana / P95 / massimo.

| Profilo | Solver C2 | Solver C3b | Totale C3b |
|---|---:|---:|---:|
{chr(10).join(node_table)}

P-01 deep-500 rimane nella stessa fascia: mediana **{p01['C2']['solverMs']['median']:.2f} → {p01['C3b']['solverMs']['median']:.2f} ms**. Non è reintrodotto il costo C1b di circa cinque secondi. I profili 12 europallet e 40 su bilico sono carichi Advanced a due gruppi del corpus C2; non vengono descritti come un diverso benchmark single.

### Browser e fallback

Chromium reale {browser['browser']}; 25 misure, cinque per percorso. Carico applicativo denso 500/500. Setup separato e pannelli chiusi non materializzati nel confronto per entrambe le versioni. Durata complessiva, long task e ritardo di un input CDP sono misurati nel browser.

| Percorso | Totale ms | Massimo long task per prova ms | Ritardo input ms |
|---|---:|---:|---:|
{chr(10).join(browser_table)}

F02, cinque campioni per combinazione, ms mediana/P95/max:

| Quantità | Percorso | C2 | C3b |
|---|---|---:|---:|
{chr(10).join(access_table)}

Per N=13/31 la C2 termina in errore senza tabella: quel tempo non è un completamento equivalente al lavoro corretto C3b. Per N=12 entrambe usano inline; il flag Worker/fallback non cambia il routing small. Non si interpreta il maggior lavoro corretto dopo F02 come perdita del solver.

90 cicli reali sulla UI C3b con 500 gruppi, 60 cancellazioni: **{life['life']['created']} Worker creati e {life['life']['closed']} chiusi**, zero URL/Worker attivi alla fine, un listener installato, risultati sempre correnti e validi. Transazione di modifica/cancellazione: **{fmt(quant(cancels))} ms**; attesa ricalcolo: **{fmt(quant(recalc))} ms**. Questi tempi includono il comando di automazione e non isolano `terminate()`. L'annullamento è misurato qui per C3b; i dati C2 dell'audit C3 sono conservati come riferimento storico, non spacciati per una nuova misura appaiata. L'heap dopo GC è nei JSON; 90 cicli non provano assenza di leak per durata indefinita.

## 8. Browser, offline e limiti

Eseguito Chromium 149 reale su Linux. HTTP statico locale con CSP della delivery; file:// HTML standalone e ZIP estratto con rete disabilitata. Worker Blob nativo e fallback, doppio calcolo, reset, input rapidi, filtri, lingua/tema e stampa verificati. Nessuna modifica alla configurazione di sicurezza del browser/sistema.

Chrome, Edge e Firefox non sono dichiarati verificati. Responsive/mobile è emulazione di viewport, non un dispositivo fisico. Stampa verificata come generazione e trasporto del documento, senza stampante fisica. Nessuna promessa di ottimalità universale, durata massima per tutti i dispositivi o preemption del fallback sincrono.

## 9. File modificati e confezionamento

Differenze rispetto ai file presenti nella delivery C2 (sorgenti e derivati):

{changed}

Nel QA è aggiornato il conteggio atteso dei cataloghi da 605 a 606, con asserzione obbligatoria della nuova chiave e controlli completi invariati; il primo gate estratto fermatosi su questo conteggio è conservato nei log.

Nel QA sono aggiunti `tests/c3b-contract-v1.5.0.mjs`, `c3b-browser-v1.5.0.mjs`, `c3b-worker-v1.5.0.mjs` e `functional-c3b-v1.5.0/`; modificato `tests/computation-v1.5.0.mjs` per sincronizzazione esplicita. Dipendenze invariate. Le differenze nei glossari/standalone/download derivano dal build, non da patch manuali dei derivati.

Due build del sito sono identiche; due confezionamenti del QA e due della delivery sono binariamente identici. ZIP/CRC, manifesti, percorsi sicuri e univoci verificati. Delivery **{next(p['bytes'] for p in proof['files'] if 'delivery.zip' in p['filename']):,} byte**, contro 9.737.277 della C2. Il QA è separato; conserva l'archivio C3 originale senza duplicare gli archivi storici in delivery.

| Artefatto | Byte | SHA-256 |
|---|---:|---|
{hash_table}

Il manifesto esterno comprende anche i report e la verifica JSON. Il suo PASS di integrità è distinto dal FUNCTIONAL PASS e dall'approvazione di rilascio. Gli originali C2/C3 rimangono invariati.

## 10. Verdetto

**FUNCTIONAL PASS:** F01 e F02 corretti; F03 gestito da una politica esplicita e verificata; F04 risolto nel QA autonomo; prova temporizzata sincronizzata e due suite estratte consecutive passate. Nessuna regressione bloccante trovata nei gate completati. C1/C1b, V-01, ranking e ottimizzazioni C2 conservati.

Restano il limite euristico C1A1626 10/7, i limiti del fallback sincrono, il possibile timeout di un singolo solve estremamente lungo e i browser/dispositivi non eseguiti. Questi limiti sono documentati, non occultati come PASS universale. Procedere con **verifica indipendente dei fix**, successivamente **C4 e approvazione manuale**. Nessun deploy o pubblicazione eseguito.
'''
report.write_text(text)
final=out/'FINAL_REPORT-v1.5.0.md';final.write_text(f'''# LoadComposer v1.5.0 — Final report C3b\n\n**FUNCTIONAL PASS** nei gate completati, {datetime.date.today().isoformat()}.\n\nCorretti il limite canonico degli strati single, la perdita della tabella per accesso individuale non consentito, il Worker pronto ma non concluso e il QA incompleto. Il test asincrono ora verifica uno stato sincronizzato.\n\n10.000 nuovi casi geometrici e 2.200 confronti esatti sulle prime due priorità; zero differenze di floor/pile o ranking a sette chiavi rispetto alla C2, zero invalidi accettati. Due estrazioni pulite installano le dipendenze e passano tutta la suite, comprese le regressioni C1/C1b, V-01 e 7.542 geometrie storiche.\n\nP-01 mediana solver C2/C3b: {p01['C2']['solverMs']['median']:.2f}/{p01['C3b']['solverMs']['median']:.2f} ms. Due build e due confezionamenti deterministici, manifesti e CRC verificati. C2 e audit C3 originali preservati.\n\nC1A1626 resta il limite noto 10/7. Restano espliciti i limiti del fallback, la politica di deadline e i browser non eseguiti. Il rapporto dettagliato FUNCTIONAL_HOTFIX-C3b-v1.5.0.md e il manifesto SHA256SUMS-C3b-v1.5.0.txt fanno parte della consegna.\n\nNon RELEASE-READY: verifica indipendente dei fix, poi C4 e approvazione manuale. **Nessun deploy, pubblicazione o GitHub release.**\n''')
artifacts=[out/n for n in ['loadcomposer-v1.5.0-delivery.zip','loadcomposer-v1.5.0-test-bundle.zip','loadcomposer-v1.5.0-standalone.html','loadcomposer-v1.5.0-standalone.zip','FUNCTIONAL_HOTFIX-C3b-v1.5.0.md','FINAL_REPORT-v1.5.0.md']]
verify=out/'PACKAGE_VERIFICATION-C3b-v1.5.0.json';verification={'version':'1.5.0','stage':'C3b','packageStatus':'PASS','functionalVerdict':'FUNCTIONAL PASS','releaseReady':False,'nextGates':['Independent fix verification','C4','Manual approval'],'noDeploy':True,'noPublication':True,'noGitHubRelease':True,'baselineAdmission':admission,'scope':scope,'packaging':proof,'twoCleanExtractions':gates,'campaigns':{'geometry':geometry,'oracle':oracle},'permanentTests':{'contracts':len(contracts['rows']),'browser':len(functionalBrowser['rows']),'worker':len(worker['rows']),'mutationCases':40,'epsilonProbes':7},'performance':perf,'realWatchdog':wall,'lifecycleSummary':{'cycles':90,'life':life['life'],'finalState':life['rows'][-1]['state']},'artifacts':[{'filename':p.name,'bytes':p.stat().st_size,'sha256':h(p)} for p in artifacts],'originalsUnchanged':all(h(Path('c3b-originals')/r['name'])==r['sha256'] for r in admission)};assert verification['originalsUnchanged'];verify.write_text(json.dumps(verification,indent=2,ensure_ascii=False)+'\n')
manifest=out/'SHA256SUMS-C3b-v1.5.0.txt';manifest.write_text(''.join(f'{h(p)}  {p.name}\n' for p in artifacts+[verify]));(b/'final-upload.json').write_text(json.dumps({'uploads':[{'local_path':str(p.resolve()),'purpose':'create_library_file','library_artifact_type':'report' if p.suffix=='.md' else 'other'} for p in artifacts+[verify,manifest]]},indent=2));print('Reports ready',len(text.split()),'words',flush=True)
