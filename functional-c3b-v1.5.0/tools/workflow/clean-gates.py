from pathlib import Path
import hashlib,json,subprocess,time,zipfile,shutil
b=Path('c3b');archive=b/'output/loadcomposer-v1.5.0-test-bundle.zip';proof=json.loads((b/'results/package-proof.json').read_text());rows=[]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for index in [1,2]:
 dest=b/f'clean-{index}';assert not dest.exists(),'Fresh directory required';dest.mkdir();zipfile.ZipFile(archive).extractall(dest);root=dest/'loadcomposer-v1.5.0-test-bundle';start=time.time();manifest=(root/'SHA256SUMS-v1.5.0.txt').read_text();count=0
 for line in manifest.splitlines():
  h,n=line.split('  ',1);assert digest(root/n)==h,n;count+=1
 assert not (root/'node_modules').exists()
 records=[]
 for name,command in [('install',['npm','ci','--offline']),('suite',['npm','test'])]:
  if name=='suite':
   for n in ['contracts.json','browser.json','worker.json','validator-mutations.json']:(root/'functional-c3b-v1.5.0/results'/n).unlink(missing_ok=True)
  at=time.time();p=subprocess.run(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=1200);log=b/'logs'/f'clean-{index}-{name}.log';log.write_text(p.stdout);record={'stage':name,'command':command,'exit':p.returncode,'seconds':time.time()-at,'logBytes':len(p.stdout),'logSHA256':digest(log),'log':p.stdout};records.append(record);print('clean',index,name,p.returncode,round(record['seconds'],2),flush=True)
  if p.returncode!=0:
   (b/'results/clean-gates-failed.json').write_text(json.dumps({'index':index,'records':records},indent=2));raise SystemExit('Clean gate failed; logs preserved')
 assert digest(root/'site/downloads/loadcomposer-v1.5.0-standalone.html')==proof['subjectSHA256']
 qa=root/'functional-c3b-v1.5.0';s={n:json.loads((qa/'results'/n).read_text()) for n in ['contracts.json','browser.json','worker.json','validator-mutations.json']};assert all(s[n].get('status')=='PASS' for n in ['contracts.json','browser.json','worker.json']);assert s['validator-mutations.json']['invalidAccepted']==[]
 text=records[-1]['log'];required=['PASS C1 quality: 17 original + 5','PASS C1b H-03 original 10/7','PASS C2 computation','PASS V-01/V-02: 57 cases','1512 blocked combinations','7542 casi','functional parity: 35/35 PASS','C3b contracts PASS','C3b browser PASS','C3b Worker PASS'];assert all(x in text for x in required),[x for x in required if x not in text]
 summary={'index':index,'freshDirectory':True,'archiveSHA256':digest(archive),'manifestFilesVerified':count,'independentInstall':True,'subjectAfterBuildMatches':True,'seconds':time.time()-start,'contracts':len(s['contracts.json']['rows']),'browserCases':len(s['browser.json']['rows']),'workerCases':len(s['worker.json']['rows']),'newRegressions':'PASS','fullSuiteRequiredMarkers':required,'stages':records};rows.append(summary);(b/'results/clean-gates.json').write_text(json.dumps({'status':'PASS' if index==2 else 'IN_PROGRESS','rows':rows},indent=2,ensure_ascii=False))
assert digest(archive)==proof['qaSHA256'];print('TWO CLEAN GATES PASS',flush=True)
