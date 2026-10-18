"""Offline pattern scan. Print locations/counts only, never matched secret values.
This is not a guarantee that arbitrary credentials are absent.
"""
import json,pathlib,re,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
patterns={
 'credential_assignment':rb'''(?i)(?:NED_API_KEY|TENNET_API_KEY|X-AUTH-TOKEN|apikey)["']?\s*[:=]\s*["']([A-Za-z0-9_-]{24,})''',
 'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'service_token':rb'(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_-]{30,}',
}
compiled={k:re.compile(v) for k,v in patterns.items()}
def scan(b):return [k for k,v in compiled.items() if v.search(b)]
tracked=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0');hits=[]
for name in filter(None,tracked):
 p=root/name
 if p.is_file():
  for kind in scan(p.read_bytes()):hits.append({'file':name,'kind':kind})
# Scan every unique reachable historical blob, including removed files.
objects=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=root).decode().splitlines()
proc=subprocess.Popen(['git','cat-file','--batch'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
history=[];blobs=0
for line in objects:
 sha,_,name=line.partition(' ');proc.stdin.write((sha+'\n').encode());proc.stdin.flush()
 header=proc.stdout.readline().decode().split();size=int(header[2]);data=proc.stdout.read(size);proc.stdout.read(1)
 if header[1]=='blob':
  blobs+=1
  for kind in scan(data):history.append({'object':sha,'path':name,'kind':kind})
proc.stdin.close();proc.wait()
client=[];public=[]
for folder,target in [('dist/client',client),('public',public)]:
 for p in (root/folder).rglob('*'):
  if p.is_file():
   for kind in scan(p.read_bytes()):target.append({'file':str(p.relative_to(root)),'kind':kind})
result={'patterns':list(patterns),'workingTreeFilesScanned':len(list(filter(None,tracked))),'historicalBlobsScanned':blobs,'trackedMatches':hits,'historicalMatches':history,'browserBuildMatches':client,'publicAssetMatches':public,'limitation':'Pattern scan, not exhaustive secret detection. User-supplied credentials in conversation history are outside repository scanning. Exact credential values are never saved in this report.'}
(root/'research/security/secret-scan.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
