import os,pathlib,shutil,subprocess,json,time
r=pathlib.Path(__file__).resolve().parents[1];qa=r/'qa/loadcomposer-v1.5.0-test-bundle';old=r/'comparison-c3d';old.mkdir(exist_ok=True)
for name in ['tests','scripts','functional-c3b-v1.5.0','capacity-c3d-v1.5.0']:
 if not (old/name).exists():shutil.copytree(qa/name,old/name)
if not (old/'site').exists():shutil.copytree(r/'previous/delivery-v1.5.0/site',old/'site')
if not (old/'node_modules').exists():(old/'node_modules').symlink_to(qa/'node_modules',target_is_directory=True)
tools=r/'audit/loadcomposer-v1.5.0-independent-capacity-verification-C3e/tools';records=[]
for version,root,names in [('C3d',old,['contracts','metadata','browser']),('C3f',qa,['separation','campaign','metadata','contracts','cache','cache-mixed','browser','verdict'])]:
 out=r/'results'/('replay-'+version);out.mkdir(exist_ok=True)
 for name in names:
  env={**os.environ,'QA_ROOT':str(root),'C3E_OUT':str(out)};start=time.time()
  with (out/(name+'.log')).open('w') as log:p=subprocess.run(['node',str(tools/(name+'.mjs'))],env=env,cwd=root,stdout=log,stderr=subprocess.STDOUT)
  records.append(dict(version=version,tool=name,exit=p.returncode,seconds=time.time()-start));print(records[-1],flush=True)
  if p.returncode:break
 for p in out.glob('*.png'):p.unlink()
(r/'results/replay-execution.json').write_text(json.dumps(records,indent=2))
