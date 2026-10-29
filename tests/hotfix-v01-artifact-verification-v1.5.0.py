"""Verify supplied final archives without changing their contents.
Usage: python3 this_script.py /absolute/output-directory /absolute/original-delivery.zip
"""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import zipfile

def sha(data): return hashlib.sha256(data).hexdigest()
def contents(path, root):
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None, f"CRC: {path}"
        names=z.namelist()
        assert len(names)==len(set(names)), f"Duplicate path: {path}"
        assert len(names)==len({n.casefold() for n in names}), f"Case collision: {path}"
        for info in z.infolist():
            n=info.filename
            assert n==root+'/' or n.startswith(root+'/'), f"Wrong root: {n}"
            assert not n.startswith('/') and '..' not in PurePosixPath(n).parts and '\\' not in n, n
            assert (info.external_attr >> 16) & 0o170000 != 0o120000, f"Symlink: {n}"
            for part in PurePosixPath(n).parts:
                assert not re.search(r'[<>:"\\|?*]|[. ]$',part), n
                assert not re.fullmatch(r'(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?',part,re.I), n
                assert part not in ['__pycache__','.cache','.pytest_cache','.mypy_cache'], n
                assert not re.fullmatch(r'zi[A-Za-z0-9]{5,}',part) and not part.endswith(('.tmp','.part','.pyc')), n
        data={i.filename[len(root)+1:]:z.read(i) for i in z.infolist() if not i.is_dir()}
        nested=0
        for name,blob in data.items():
            if name.endswith('.zip'):
                with zipfile.ZipFile(io.BytesIO(blob)) as inner: assert inner.testzip() is None, name
                nested+=1
        return data, len(names), nested

def verify(out, baseline):
    out=Path(out)
    delivery,entries,nested=contents(out/'loadcomposer-v1.5.0-delivery.zip','delivery-v1.5.0')
    sums='SHA256SUMS-v1.5.0.txt';manifest='DELIVERY_MANIFEST-v1.5.0.txt'
    covered={}
    for line in delivery[manifest].decode().splitlines():
        h,size,name=line.split('  ',2);assert name not in covered
        assert sha(delivery[name])==h and len(delivery[name])==int(size),name
        covered[name]=h
    assert set(covered)==set(delivery)-{manifest,sums}
    coveredSums={}
    for line in delivery[sums].decode().splitlines():
        h,name=line.split('  ',1);assert name not in coveredSums;assert sha(delivery[name])==h,name;coveredSums[name]=h
    assert set(coveredSums)==set(delivery)-{sums}
    for name in ['package.json','package-lock.json','scripts/browser-runtime.mjs']: assert name in delivery,name
    assert not any(n.startswith(('tests/','.github/','hotfix-v01-v1.5.0/')) or n.endswith('-test-bundle.zip') for n in delivery)
    package=json.loads(delivery['package.json']);lock=json.loads(delivery['package-lock.json'])
    assert package['version']==lock['version']=='1.5.0'
    assert package['devDependencies']==lock['packages']['']['devDependencies']
    qa,qaEntries,qaNested=contents(out/'loadcomposer-v1.5.0-test-bundle.zip','loadcomposer-v1.5.0-test-bundle')
    qaCovered={}
    for line in qa[sums].decode().splitlines():
        h,name=line.split('  ',1);assert name not in qaCovered;assert sha(qa[name])==h,name;qaCovered[name]=h
    assert set(qaCovered)==set(qa)-{sums}
    for name in ['package.json','package-lock.json','site/index.html','site/advanced-stacking-validator.js','scripts/browser-runtime.mjs']:
        assert qa[name]==delivery[name],name
    assert sha(qa['loadcomposer-v1.4.0-test-bundle.zip'])=='db94ff5ff538c95af85197df78868e34d48c1641d55da4d582fcda11f7aeac27'
    assert sha(qa['hotfix-v01-v1.5.0/loadcomposer-v1.5.0-independent-audit-original.zip'])=='295e62b30b5475fc4da64a851caa5a485f382482a415f8d56a4222cc7439cd88'
    assert sha(qa['hotfix-v01-v1.5.0/INDEPENDENT_AUDIT-v1.5.0-original.md'])=='03abe68222d4e0f09ac2adcdc27f01dd9ab32b768a4f08b04c97d6b15fced07e'
    assert sha(qa['hotfix-v01-v1.5.0/INDEPENDENT_AUDIT-PACKAGE-VERIFICATION-original.json'])=='c30f8fbc921aa51f8281e8573076eb0499b4bd6ba83c09b5f38f226f69c120d4'
    standalone,standaloneEntries,_=contents(out/'loadcomposer-v1.5.0-standalone.zip','loadcomposer-v1.5.0-standalone')
    name='loadcomposer-v1.5.0-standalone.html';html=(out/name).read_bytes()
    assert standalone[name]==html==delivery['site/downloads/'+name]==qa['site/downloads/'+name]
    assert (out/'loadcomposer-v1.5.0-standalone.zip').read_bytes()==delivery['site/downloads/loadcomposer-v1.5.0-standalone.zip']
    public=[];unchanged=[];changed=[]
    with zipfile.ZipFile(baseline) as original:
        for i in original.infolist():
            if i.is_dir():continue
            name=i.filename.split('/',1)[1];before=original.read(i)
            assert name in delivery, 'Lost baseline distributive file: '+name
            if before==delivery[name]:unchanged.append(name)
            else:changed.append(name)
            if name.startswith('site/downloads/') and name!='site/downloads/index.html' and 'v1.5.0' not in name:
                assert before==delivery[name],name;public.append(name)
    return {'status':'PASS','delivery':{'files':len(delivery),'entries':entries,'manifest':len(covered),'checksums':len(coveredSums),'nestedZipsCrcPass':nested},
      'qa':{'files':len(qa),'entries':qaEntries,'checksums':len(qaCovered),'nestedZipsCrcPass':qaNested},
      'standalone':{'entries':standaloneEntries,'downloadAndExternalBytesEqual':True},'npmDescriptorsSynchronized':True,
      'originalAuditPreserved':True,'historicalPublicFilesUnchanged':len(public),'baselineDistributiveFilesUnchanged':len(unchanged),
      'changedBaselinePaths':changed,'addedDeliveryPaths':sorted(set(delivery)-set(unchanged)-set(changed)),
      'artifacts':[{"name":p.name,"bytes":p.stat().st_size,"sha256":sha(p.read_bytes())} for p in sorted(out.iterdir()) if p.is_file() and (p.suffix=='.zip' or p.name.endswith('-standalone.html'))]}

if __name__=='__main__':
    print(json.dumps(verify(sys.argv[1],sys.argv[2]),indent=2))
