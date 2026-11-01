from pathlib import Path
import hashlib,json,zipfile,sys
b=Path('c3b');w=b/'work';old=b/'baseline/delivery-v1.5.0';stage=sys.argv[1] if len(sys.argv)>1 else 'A';out=b/f'output/LoadComposer-C3b-{stage}-checkpoint.zip';selected={}
for p in old.rglob('*'):
 if p.is_file():
  q=w/p.relative_to(old)
  if q.exists() and p.read_bytes()!=q.read_bytes():selected['work/'+str(p.relative_to(old))]=q
for d in ['tests','functional-c3b-v1.5.0']:
 for p in (w/d).rglob('*'):
  if p.is_file() and (d!='tests' or p.name.startswith(('c3b-','computation-v1.5.0','i18n-catalogs-v1.5.0'))):selected['work/'+str(p.relative_to(w))]=p
for d in ['tools','logs','results','custody']:
 for p in (b/d).rglob('*'):
  if p.is_file():selected[str(p.relative_to(b))]=p
for p in w.iterdir():
 if p.is_file() and p.suffix in ['.json','.log']:selected['work/'+p.name]=p
manifest={n:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for n,p in selected.items()};meta={'stage':'C3b-'+stage,'partial':True,'recovery':'Admit original C2 delivery+QA, assemble prepare-work.py, then overlay this delta. Production subject is frozen; campaigns may still be in progress.','files':manifest};(b/'CHECKPOINT.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for n,p in sorted(selected.items()):z.write(p,n)
 z.write(b/'CHECKPOINT.json','CHECKPOINT.json')
print(out,out.stat().st_size,hashlib.sha256(out.read_bytes()).hexdigest());(b/'checkpoint-upload.json').write_text(json.dumps({'uploads':[{'local_path':str(out.resolve()),'purpose':'create_library_file'}]}))
