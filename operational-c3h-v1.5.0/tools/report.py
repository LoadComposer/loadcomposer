from pathlib import Path
import hashlib,json,zipfile,datetime,shutil,platform
root=Path(__file__).resolve().parents[2];out=root/'operational-c3h-v1.5.0/results';target=root.parent/'C3h';read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
contracts=read(out/'contracts.json');browser=read(out/'browser-c3h.json');arrival=read(out/'arrival.json');state=read(out/'current-state.json');node=read(out/'benchmark-independent.json');bench=read(out/'browser-benchmark-independent.json');packing=read(target/'package-check.json');clean=read(target/'clean-qa.json');scope=read(out/'scope.json');custody=read(out/'custody.json')
assert len(clean)==4 and all(r['exit']==0 for r in clean)
for r in custody['rows']:assert sha(root.parent/'upload'/r['file'])==r['sha256'],r['file']
files=['loadcomposer-v1.5.0-delivery.zip','loadcomposer-v1.5.0-test-bundle.zip','loadcomposer-v1.5.0-standalone.html','loadcomposer-v1.5.0-standalone.zip']
artifacts=[dict(file=n,sha256=sha(target/n),bytes=(target/n).stat().st_size) for n in files]
stats=lambda x:f"{x['median']:.2f} / {x['p95']:.2f} / {x['max']:.2f}"
nodeTable='\n'.join('| '+p+' | '+stats(next(r for r in node['summary'] if r['profile']==p and r['version']=='C3f')['total'])+' | '+stats(next(r for r in node['summary'] if r['profile']==p and r['version']=='C3h')['total'])+' |' for p in [p['id'] for p in node['profiles']])
browserTable='\n'.join('| '+p+' | '+m+' | '+stats(next(r for r in bench['summary'] if r['profile']==p and r['mode']==m and r['version']=='C3f')['total'])+' | '+stats(next(r for r in bench['summary'] if r['profile']==p and r['mode']==m and r['version']=='C3h')['total'])+' |' for p in [p['id'] for p in bench['profiles']] for m in ['worker','fallback'])
hashTable='\n'.join('| '+r['file']+' | `'+r['sha256']+'` |' for r in artifacts)
cleanTable='\n'.join(f"| {r['extraction']} | {r['command']} | {r['exit']} | {r['seconds']:.2f} |" for r in clean)
changes='\n'.join('- `'+r['path']+'`' for r in scope['modified'])
text=f'''# LoadComposer v1.5.0 — C3h Operational Eligibility Reconciliation Hotfix

**Verdetto: OPERATIONAL ELIGIBILITY PASS.** G01 corretto nelle prove eseguite; risultati sani preservati; nessuna regressione bloccante osservata. **Non RELEASE-READY.** Occorrono la verifica indipendente mirata della decisione operativa e poi C4. Nessun deploy, pubblicazione o GitHub release.

Verifica del 24 ottobre 2026, Europe/Rome. Base produttiva esclusiva C3f OPERATIONAL VALIDATION PASS. Il nuovo lavoro è una correzione del manutentore; non viene presentato come una nuova verifica indipendente Astra.

## 1. Ammissione e conservazione

Verificati i cinque hash obbligatori (quattro prodotti C3f e QA C3g), tutti gli hash dei due manifesti esterni forniti, i CRC e i manifesti interni disponibili. `results/custody.json` conserva i 12 hash degli allegati e il controllo degli archivi. Ricontrollati gli stessi 12 file alla conclusione: originali byte-identici. La C3d compare esclusivamente nelle fixture storiche di regressione; non è sorgente della C3h.

Le directory di lavoro iniziali erano già estratte: è stata verificata l'identità di tutti i file `site/` con il QA C3f prima di modificare la produzione. Non sono stati usati file produttivi di altre candidate.

## 2. Riproduzione G01 prima della correzione

Rieseguiti sulla C3f intatta `tools/counterexample.mjs` e `tools/browser.mjs` originali C3g. Nei due minimi, single e mixed floor-only, la riduzione coerente 2→1 conserva geometria valida, `ok=true` e gate di stampa positivo. Nel single la capacità alternativa completa da una posizione è un witness valido secondo R01; non è una nuova asserzione di ottimalità.

Nel browser, **18 combinazioni C3f** (HTTP, file e ZIP × Worker, fallback e inline × single/mixed) producono realmente il documento non dovuto dopo la riduzione. Worker/fallback: 13 richiesti e 12 rappresentati. Inline: 2 richiesti e 1 rappresentato. Gli HTML generati dal vero percorso di composizione di stampa restano in `results/before/G01-C3f-*.html`; il replay conserva anche sei controlli storici C3d separati. Le evidenze originali C3g sono conservate con etichetta `c3g-original`, distinte dalle nuove esecuzioni.

## 3. Causa e criterio canonico

La C3f rivalidava geometria e metadati, poi applicava `result.ok = result.ok === true && result.validation.valid`. Un partial coerente supera correttamente la geometria; il precedente successo sopravviveva. La regola impediva anche di riabilitare un risultato sano completo dopo soli flag negativi obsoleti.

La funzione minima `reconcileOperationalEligibility(result)` ha una precondizione esplicita: validazione appena eseguita con il validatore appropriato, incluso V-01 per le pile Advanced. Se esiste un errore strutturale, forza `ok=false` senza tentare riparazioni della geometria. Altrimenti:

1. Legge la richiesta canonica: `input.quantity` single, somma di `input.types[].quantity` mixed.
2. Confronta la richiesta positiva e ammessa (massimo 500) con `placedCount`, che il validatore ha appena riconciliato con le rappresentazioni effettive.
3. Richiede validazione positiva, nessun errore strutturale e identità canonica del job/mezzo per i risultati installati.
4. Deriva da questo controllo `ok`, `fitsQtyBySpace` e, per il mixed, `allPlaced`.

Il numero di rettangoli a terra non viene usato come numero di pallet Advanced. Nel single il validatore continua a riconciliare stackCounts, loadedPalletCount, strati, pile e riepiloghi. Nel mixed floor-only controlla riferimenti, posizioni e unplaced; V-01 controlla tutte le identità e i livelli delle pile Advanced.

I vecchi `ok`, `validation.valid`, `allPlaced` e `fitsQtyBySpace` non forniscono evidenza positiva. Gli ultimi due sono riepiloghi derivati: le sole loro incoerenze non corrompono un piano valido e vengono riconciliate dopo la validazione. Restano obbligatori tutti i conteggi e i riferimenti strutturali. Non si riparano alias, pile, capacità o coordinate discordanti.

`matchesCanonicalResult` verifica versione del job, contenuto completo della richiesta rispetto alla chiave privata del job e appartenenza del mezzo al catalogo canonico. I risultati di producer puri senza versione conservano il contratto diagnostico preesistente; quelli installati hanno sempre una versione. Il gate di stampa richiede inoltre assenza di job pendente e input UI correnti. Modifiche silenziose agli input vengono controllate dal percorso finale di stampa; gli eventi normali invalidano immediatamente il job.

| Piano | GEOMETRY VALID (struttura/geometria) | LOAD COMPLETE | OPERATIONALLY ELIGIBLE | PRINT ALLOWED |
|---|---|---|---|---|
| Completo, valido, corrente e accessibile | sì | sì | sì | sì |
| Parziale coerente e accessibile | sì | no | no | no |
| Vuoto coerente | sì | no | no | no |
| Completo, apertura/altezza non idonea | sì se struttura/geometria sane | sì | no | no |
| Struttura corrotta con vecchio successo | no | conteggio non attendibile | no | no |
| Completo sano, job/input obsoleti | sì | sì | no | no |

`validation.valid` include anche accesso e altezza, mentre nei nuovi report `geometryValid` separa l'assenza di errori strutturali dall'esito operativo. Non viene chiamato errore un partial che supera la geometria.

## 4. Codice e sincronizzazione UI

Produzione manuale modificata: `site/index.html` e `site/computation-runtime.js`. Il runtime usa lo stesso percorso di validazione/riconciliazione al ricevimento e non esegue più la precedente validazione geometrica duplicata. Restano verificati envelope del payload, ordine/versioni, quantità strutturali, rappresentazioni, limiti, accesso per mezzo e V-01. Le sole copie obsolete dei flag di completezza non provocano più un fallimento globale.

Il producer sincrono applica la stessa decisione canonica. Il core computazionale generato e il programma Worker sono **byte-identici alla C3f**. Sono byte-identici anche motore Advanced, validatore V-01 e lockfile: nessuna modifica a solver, ranking, ricerca, mezzi, cataloghi o ottimizzazioni P-01. Patch completa e inventario in `source-delta.patch` e `results/scope.json` ({len(scope['unchanged'])} file comuni invariati).

File comuni modificati e output derivati:

{changes}

Gli altri cambiamenti sono nuovi test/strumenti/evidenze C3h e wiring QA. Il packager esclude il nuovo sottoalbero QA dalla delivery.

`drawSelected` rileva il cambio dei riepiloghi operativi e aggiorna una sola volta tabella e selettore prima di mostrare la preview. La chiamata diretta a `printCurrentLayout`, senza precedente redraw, sincronizza anch'essa lo stato se scopre la transizione. La preview parziale rimane disponibile con quantità mancanti e messaggio di stampa non disponibile. Non viene generato un documento operativo. Nessun ciclo ricorsivo di rendering o nuovo solve geometrico nel predicato.

## 5. Nuovi test permanenti

`npm run test:c3h`, incluso in `npm test`, contiene:

- **{len(contracts['rows'])} controlli contrattuali**: replay esatti C3g, 2→1, 13→12, 500→499, mixed 1→0, gruppi distinti e omogenei, Advanced con/senza pile, flag obsoleti positivi/negativi, struttura invalida, apertura non idonea, campioni completi/parziali/vuoti, stacking OFF e maxLayers 1/2/3, quantità 99/120/500. Confronto sano C3f/C3h di tutti i campi semantici; solo durate diagnostiche Ms escluse dal confronto.
- **{len(browser['rows'])} scenari Chromium G01**: HTTP/file/ZIP offline, Worker/fallback/inline; tabella verificata prima di un renderTable esplicito nel test; richiesta 13/12 o 2/1; zero documenti parziali e controlli sani stampabili; sette lingue, due viste, B/W, temi e filtri, input cambiati, reset e nuovo calcolo. Il mixed prova anche la chiamata diretta alla stampa prima della preview.
- **{len(arrival['rows'])} scenari di arrivo**: Worker nativo e fallback; sani, omissioni, partial coerenti con vecchio `ok=true`, completezza positiva obsoleta e flag negativi su completi. Le omissioni strutturali continuano a fallire; i partial coerenti rimangono risultati sani non stampabili.
- **36 verifiche di stato corrente**: vecchi flag negativi, job sbagliato, richiesta alterata pur geometricamente valida, mezzo alterato, corruzione e input UI silenziosamente cambiato. Due tentativi di stampa per variante; controllati anche numero di schemi generati e documenti effettivi.

Una riduzione single 1→0 che fabbrica capacità teorica zero mentre il vano contiene un pallet viola il witness R01: viene correttamente rifiutata come struttura incoerente. Non è stata indebolita R01 per farla passare. I veri vuoti single prodotti dal solver e il mixed 1→0 coerente restano validi e non stampabili. Il contratto completo di capacità viene conservato.

I test non sono limitati al controesempio minimo: famiglie nuove, quantità e combinazioni multiple, confronto sano completo e alterazioni simultanee di stato sono separati dal replay originale. Si tratta comunque di QA del manutentore, non del successivo audit indipendente.

## 6. Regressioni e verifiche da pacchetto

Suite storiche effettivamente rieseguite con `npm test`, due volte da **due estrazioni QA pulite**, ognuna preceduta da `npm ci --offline` senza copiare node_modules:

| Estrazione | Comando | Exit | Secondi |
|---|---|---:|---:|
{cleanTable}

Incluse 7.542 geometrie storiche, E01/R01, F01–F04, V-01/V-02, 17 controesempi Astra e cinque riduzioni, H-03 originale/ridotto, C1G00034, regressione single/mixed, controlli per mezzo, 99/120/500 e limite 501, sette lingue, offline, preview/stampa, interazioni Worker/fallback/inline e packaging standalone. I log completi finali sono nell'archivio complementare di evidenze di verifica. La prima esecuzione durante lo sviluppo conserva il proprio errore relativo ai nuovi test e agli output standalone non ancora riallineati; non è usata come PASS della build finale.

I due controlli release opzionali `test:release-input-admission` e `test:release-historical` sono stati tentati: exit 1 per prerequisiti non forniti (delivery v1.4.0 approvata e LOADCOMPOSER_V140_ROOT). Non viene dichiarata una nuova certificazione dell'intera storia dei file v1.4. Questo limite è distinto dalle 7.542 geometrie rieseguite e dai PASS delle suite npm test. Gli esiti sono conservati integralmente.

## 7. Prestazioni C3f/C3h sullo stesso ambiente

{node['host']['node']}, {node['host']['cpu']}, {node['host']['platform']}/{node['host']['arch']}. Chromium {bench['browser']}. Benchmark eseguiti senza altre suite in parallelo, ordine versioni alternato; nessun campione escluso. Node: **{node['samples']} campioni**, 16 per profilo/versione, 12 mezzi; ulteriori 24 finestre cache fredda/ripetuta. Browser: **{bench['samples']} campioni**, 9 per profilo/versione/modalità, setup UI escluso. I raw separano producer, validazione, gate, rendering, memoria osservata e long task ove misurati.

Millisecondi: **mediana / P95 / massimo**, nearest-rank. Con n=16 o n=9 P95 coincide con massimo: nessuna pretesa di stima robusta delle code.

| Profilo Node (12 mezzi) | C3f | C3h |
|---|---:|---:|
{nodeTable}

| Profilo Chromium | Modalità | C3f | C3h |
|---|---|---:|---:|
{browserTable}

È osservato un nuovo costo nel profilo sintetico deep-500: mediana browser Worker **618,5→663,2 ms (+44,7 ms, +7,2%)**, fallback **728,4→784,6 ms (+56,2 ms, +7,7%)**; massimi **646,3→716,8** e **767,2→833,8 ms**. Le mediane di rendering crescono 59→103,6 e 55→102 ms, insieme al controllo canonico della richiesta densa. Questa è una correlazione delle componenti misurate, non una prova di causalità esclusiva. Il costo è conservato come limite prestazionale osservato, non nascosto né compensato eliminando gate. Il mixed-floor-99 scende invece nelle mediane browser **139,4→120 ms Worker** e **151,8→140 ms fallback**; la rivalidazione dei gate è ancora attiva, mentre viene rimossa la doppia validazione di arrivo.

I risultati sani coincidono per tutti i campioni di confronto, compresi conteggi, capacità ed esito operativo. Il costo nuovo non ricostruisce geometria nel predicato; la riconciliazione di completezza è lineare nei gruppi e il controllo della richiesta versionata confronta la chiave canonica. Le validazioni dei gate restano attive. La rimozione della sola doppia validazione all'arrivo non elimina la rivalidazione finale.

Le misure precedenti C3g (circa +39–46 ms mixed-floor rispetto a C3d) restano in `results/c3g-original/`, separate dal confronto attuale. I raw nuovi conservano ogni rallentamento e massimo: non si attribuiscono automaticamente i picchi a GC, scheduler o codice. Le misure heap della sola pagina non certificano assenza di leak e non includono la memoria dei Worker. Il fallback sincrono resta non preinterrompibile durante un solve.

## 8. Build, archivi e integrità finale

Due build complete confrontate su tutti i file site: identiche. Due confezionamenti indipendenti QA e due delivery: SHA-256 identici tra i due round. CRC, percorsi, manifesti e checksum interni verificati. Tutti i file produttivi/build/script comuni delivery/QA confrontati byte per byte. HTML esterno, nello standalone ZIP, nel QA e nella delivery identici. Nessun node_modules trasferito nelle estrazioni pulite. Installazione offline riuscita con cache npm popolata; non si dichiara un npm autonomo senza cache.

Il primo confezionamento delivery ha segnalato un log di installazione preesistente fuori dall’inventario QA; il log è stato conservato nel nuovo sottoalbero delle evidenze e il confezionamento è stato ripetuto, senza modificare produzione o indebolire il controllo del packager.

Delivery compatta separata dalle evidenze; test bundle con codice completo, test riproducibili, fixture e risultati. Gli esiti delle verifiche eseguite dopo il confezionamento sono nel companion `loadcomposer-v1.5.0-C3h-verification-evidence.zip` e nella verifica JSON esterna, per evitare un hash auto-referenziale o archivi mutati dopo i test.

| Artefatto | SHA-256 finale |
|---|---|
{hashTable}

## 9. Limiti e passaggio successivo

Copertura mirata, non universale. Browser reale Linux Chromium headless; nessuna nuova certificazione di Firefox, Edge separato, dispositivi fisici, stampante fisica o dialogo di stampa del sistema. I test controllano il documento realmente composto e il trasporto di stampa esistente; non certificano un carico fisico. Nessuna nuova prova universale di ottimalità del solver, stabilità o peso.

I lunghi timeout previsti dalle suite restano invariati; eventuali simulazioni di orologio già previste dai test storici restano tali. Le nuove prove G01 usano Worker reale; non vengono equiparate a JSDOM o a un Worker simulato. Le prestazioni sono osservazioni nell'ambiente indicato, non SLA.

**OPERATIONAL ELIGIBILITY PASS, limitato ai gate e alle verifiche documentate.** Restano obbligatori l'audit indipendente mirato della decisione operativa e poi C4. Nessuna promozione automatica a RELEASE-READY.
'''
(target/'OPERATIONAL_ELIGIBILITY_HOTFIX-C3h-v1.5.0.md').write_text(text)
summary=f'''# LoadComposer v1.5.0 — C3h

**OPERATIONAL ELIGIBILITY PASS** nelle verifiche documentate. Non RELEASE-READY; nessun deploy/pubblicazione/release.

G01 riprodotto su C3f e corretto: l'idoneità deriva dalla richiesta canonica, dai conteggi effettivamente riconciliati dalla validazione e dal job corrente. Un partial valido conserva la preview diagnostica, non FITS e non stampa. Vecchi flag positivi/negativi non sono evidenza operativa. Aggiornati ricevimento, producer sincrono, tabella, preview e gate di stampa, inclusa la stampa diretta.

{len(contracts['rows'])} test contrattuali C3h; 18 scenari browser G01; 20 arrivi Worker/fallback; 36 verifiche di stato. Due QA estratti puliti: npm ci e npm test PASS. Rieseguite le 7.542 geometrie, suite Astra/H-03/C1G, V-01/V-02/F01–F04/E01/R01 e le regressioni operative. Solver/core/Worker/engine Advanced/validatore V-01/lockfile byte-identici alla C3f. Originali invariati.

Due build e due confezionamenti deterministici, CRC/manifesti/equivalenza PASS. Benchmark C3f/C3h: {node['samples']} campioni Node e {bench['samples']} Chromium, raw e massimi conservati nel QA. I due controlli release opzionali v1.4 restano non disponibili per prerequisiti mancanti; non invalidano il PASS delle suite eseguite né vengono dichiarati superati.

Il rapporto OPERATIONAL_ELIGIBILITY_HOTFIX-C3h-v1.5.0.md documenta riproduzione, contratto, codice, casi, tempi e limiti. I log delle due estrazioni pulite sono nel companion di evidenze finali. Prossimo passo: verifica indipendente mirata, poi C4.
'''
(target/'FINAL_REPORT-v1.5.0.md').write_text(summary)
# Preserve external verification logs without modifying the already tested archive.
evidence=target/'loadcomposer-v1.5.0-C3h-verification-evidence.zip'
with zipfile.ZipFile(evidence,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(target.iterdir()):
  if p.suffix=='.log' or p.name in ['clean-qa.json','package-check.json']:
   info=zipfile.ZipInfo('C3h-verification/'+p.name,(2026,10,24,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,p.read_bytes())
 with zipfile.ZipFile(target/'loadcomposer-v1.5.0-test-bundle.zip') as q:
  for prefix in ['site/','scripts/','tests/','package.json','package-lock.json']:
   for n in q.namelist():
    rel=n.split('/',1)[1]
    if rel==prefix or rel.startswith(prefix):
     expected=hashlib.sha256(q.read(n)).hexdigest()
     for k in [1,2]:assert sha(root.parent/f'clean-c3h-{k}/loadcomposer-v1.5.0-test-bundle'/rel)==expected,('post-test runnable payload',k,rel)
verification=dict(product='LoadComposer',version='1.5.0',candidate='C3h',verdict='OPERATIONAL ELIGIBILITY PASS',releaseReady=False,independentReviewRequired=True,c4Authorized=False,deploy=False,publication=False,githubRelease=False,originalsUnchanged=True,baseline=custody,scope=scope,tests=dict(contracts=len(contracts['rows']),browserG01=len(browser['rows']),arrival=len(arrival['rows']),currentState=36,cleanExtractions=clean,postTestRunnablePayloadByteIdentity=True),packaging=packing,artifacts=artifacts+[dict(file=evidence.name,sha256=sha(evidence),bytes=evidence.stat().st_size)],performance=dict(nodeSamples=node['samples'],browserSamples=bench['samples'],nodeSummary=node['summary'],browserSummary=bench['summary']),limits=['v1.4 release optional checks unavailable: missing approved delivery/root','Linux headless Chromium only; no physical printer certification','independent targeted audit and C4 still pending'])
(target/'PACKAGE_VERIFICATION-C3h-v1.5.0.json').write_text(json.dumps(verification,indent=2)+'\n')
manifestFiles=files+['OPERATIONAL_ELIGIBILITY_HOTFIX-C3h-v1.5.0.md','FINAL_REPORT-v1.5.0.md','PACKAGE_VERIFICATION-C3h-v1.5.0.json',evidence.name]
(target/'SHA256SUMS-C3h-v1.5.0.txt').write_text(''.join(sha(target/n)+'  '+n+'\n' for n in manifestFiles))
print('Final reports, verification, companion logs and checksums PASS')
