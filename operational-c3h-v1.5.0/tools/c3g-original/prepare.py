"""Admit supplied, immutable baselines; extract only into this independent QA directory."""
import argparse,pathlib,hashlib,zipfile,shutil,json
r=pathlib.Path(__file__).resolve().parents[1];p=argparse.ArgumentParser()
for name in ['qa','delivery','previous','html','standalone']:p.add_argument('--'+name,required=True,type=pathlib.Path)
a=p.parse_args();(r/'originals').mkdir(exist_ok=True);(r/'results').mkdir(exist_ok=True)
items=[('qa','loadcomposer-v1.5.0-test-bundle(8).zip','3c3c7b742747a8e995415c3369e6aaf016391102c912cff3878141f4546e02cf','qa'),('delivery','loadcomposer-v1.5.0-delivery(8).zip','0e58f17afd2e9ebf955ac61ce8343c27f021858decb4ac538bf5a1ed8660c2c6','candidate'),('previous','loadcomposer-v1.5.0-delivery(7).zip','0c418f38644563dba52e806583479f474f2867397066d0435a3fc2eaf26e7345','previous'),('html','loadcomposer-v1.5.0-standalone(8).html','119225cbfc97305b816d92d357387bf27b1b75253a2b875a5da709c336e72c4e',None),('standalone','loadcomposer-v1.5.0-standalone(8).zip','396ff5f072936939b99158cc23319c472897a3a184b886bfc58f5962b895d0d3','standalone')]
records=[]
for key,name,expected,dest in items:
 src=getattr(a,key);actual=hashlib.sha256(src.read_bytes()).hexdigest();assert actual==expected,(key,actual);target=r/'originals'/name
 if src.resolve()!=target.resolve():shutil.copyfile(src,target)
 if dest:
  with zipfile.ZipFile(target) as z:
   assert z.testzip() is None
   assert len(z.namelist())==len(set(z.namelist()))
   assert all(not pathlib.PurePosixPath(n).is_absolute() and '..' not in pathlib.PurePosixPath(n).parts for n in z.namelist())
   z.extractall(r/dest)
 records.append(dict(role=key,path=str(target),sha256=actual))
(r/'results/admission-reproduced.json').write_text(json.dumps(records,indent=2));print('Admitted',len(records),'baselines; originals preserved')
