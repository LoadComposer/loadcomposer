from pathlib import Path
import subprocess,time,json,sys
name,cwd,*cmd=sys.argv[1:];b=Path('c3b');at=time.time();r=subprocess.run(cmd,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);(b/'logs'/f'{name}.log').write_text(r.stdout);status={'exit':r.returncode,'seconds':time.time()-at,'cwd':cwd,'command':cmd,'logBytes':len(r.stdout)};(b/'results'/f'{name}-execution.json').write_text(json.dumps(status,indent=2));print(name,status,flush=True);sys.exit(r.returncode)
