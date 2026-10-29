import pathlib,json,hashlib,zipfile,shutil,datetime
r=pathlib.Path(__file__).resolve().parents[1];out=r/'output';out.mkdir(exist_ok=True);sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda n:json.loads((r/'results'/n).read_text())
name='loadcomposer-v1.5.0-independent-operational-verification-C3g';files={}
for directory in ['tools','results']:
 for p in (r/directory).rglob('*'):
  if p.is_file() and p.suffix not in ('.png','.pyc') and '__pycache__' not in p.parts:files[p.relative_to(r).as_posix()]=p.read_bytes()
files['README.md']=(r/'README.md').read_bytes()
report=out/'INDEPENDENT_OPERATIONAL_VERIFICATION-C3g-v1.5.0.md';files[report.name]=report.read_bytes()
for n in ['OPERATIONAL_LAYOUT_HOTFIX-C3f-v1.5.0.md','FINAL_REPORT-v1.5.0(8).md','PACKAGE_VERIFICATION-C3f-v1.5.0.json','SHA256SUMS-C3f-v1.5.0.txt']:files['originals/'+n]=(r/'originals'/n).read_bytes()
for case in load('G01-minimal.json')['cases']:files['fixtures/G01-'+case['family']+'.json']=json.dumps(case,indent=2).encode()
files['SHA256SUMS-QA.txt']=''.join(sha(b)+'  '+n+'\n' for n,b in sorted(files.items())).encode()
zpath=out/(name+'.zip')
with zipfile.ZipFile(zpath,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,b in sorted(files.items()):
  info=zipfile.ZipInfo(name+'/'+n,date_time=(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,b,compresslevel=9)
with zipfile.ZipFile(zpath) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))
 for line in z.read(name+'/SHA256SUMS-QA.txt').decode().splitlines():h,n=line.split('  ',1);assert sha(z.read(name+'/'+n))==h
c=load('campaign.json');b=load('browser-independent.json');m=load('mixed-diagnostics.json');perf=load('benchmark-independent.json');browserperf=load('browser-benchmark-independent.json');runs=load('final-runs.json')
assert c['healthy']==720 and len(c['findings'])==41
assert all(all(x['checks'].values()) for x in b['rows'])
assert len([x for x in b['rows'] if x['version']=='C3f' and x['result']['partial']['printDelta']])==18
assert not m['findings']
assert all(x['exit']==0 for x in runs if not x['name'].startswith('release-'))
assert len(load('arrival.json')['rows'])==12 and len(load('healthy-browser.json')['rows'])==10
artifact=lambda p:{'file':p.name,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
verification={'review':'C3g','product':'LoadComposer','version':'1.5.0','candidate':'C3f OPERATIONAL VALIDATION PASS','completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verdict':'NO-GO','c4Authorized':False,'productionModified':False,'deploy':False,'publication':False,'baselineAdmission':load('admission.json'),'sourceScope':load('scope.json'),'finalIntegrity':load('final-integrity.json'),'findings':[{'id':'G01-C3g','severity':'blocking for this audit','classification':'residual operational eligibility defect; valid partial geometry','cause':'final gate retains previous ok when geometry is valid, without reconciling current completion','expected':'valid partial remains structurally valid but not FITS or printable','actual':'old positive ok survives and real print documents are generated','minimal':'fixtures/G01-single.json; fixtures/G01-mixed-floor.json','browserCombinationsC3f':18,'occurrenceInUnmodifiedHealthyProducer':'not demonstrated','alreadyPresentC3d':True}],'originalE01':{'C3dAccepted':True,'C3fRejected':True},'independent':{'singleSeed':c['seed'],'singleHealthy':720,'complete':310,'partial':156,'zero':254,'multilevel':47,'truncatedCapacity':143,'singleNegativeMutations':432,'coherentPartialFindings':41,'mixedHealthyConfigurations':80,'mixedNegativeMutations':len(m['rows']),'localizationComparisons':len(m['locales']),'browserPostValidation':len(b['rows']),'browserCandidatePostValidation':18,'arrivalScenarios':12,'healthyBrowserScenarios':10,'healthyVehicleRows':120,'filterChanges':80,'regularCapacityWitnesses':12},'originalC3eReplay':load('replay-execution.json'),'originalC3eCampaign':load('replay-C3f/campaign.json')['summary'],'originalC3eMetadata':{'C3dAccepted':12,'C3fAccepted':0,'cases':124},'finalExecutions':runs,'browser':{'actual':browserperf['browser'],'engine':'native Linux Chromium headless','routes':['local HTTP','standalone file','extracted standalone ZIP'],'offline':'file/ZIP contexts offline before navigation','modes':['Worker','fallback','inline'],'physicalPrinter':False,'otherBrowsers':[],'longWorkerDeadlines':'simulated Chromium clock'},'performance':{'nodeSamples':perf['samples'],'nodeSummary':perf['summary'],'coldWindows':perf['coldSummary'],'browserSamples':browserperf['samples'],'browserSummary':browserperf['summary'],'freshProcessCold':load('cold-process.json'),'environment':perf['host'],'timingsAreSameEnvironmentVersionComparisons':True},'limitations':['No universal optimality or memory-leak certification','Release-only v1.4 admission/history commands blocked by separately required approved v1.4 delivery/root; normal npm test passed','Initial offline npm ci ENOTCACHED; ordinary npm ci installed pinned dependencies','G01 demonstrated by controlled in-memory mutation, not spontaneously produced healthy output','P95 equals max at these sample sizes','No physical printer, Firefox, Edge or separate Chrome execution'],'package':{'archive':artifact(zpath),'report':artifact(report),'crc':'PASS','uniquePaths':True,'internalManifestEntries':len(files)-1,'zipEntries':len(files),'historicalHeavyArchivesDuplicated':False}}
vp=out/'PACKAGE_VERIFICATION-C3g-v1.5.0.json';vp.write_text(json.dumps(verification,indent=2))
manifest=out/'SHA256SUMS-C3g-v1.5.0.txt';manifest.write_text(''.join(f"{sha(p.read_bytes())}  {p.name}\n" for p in [report,zpath,vp]))
receipt=[artifact(p) for p in [report,zpath,vp,manifest]];(r/'final-artifacts.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2))
