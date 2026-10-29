import json
s=open('shell.html').read()
css=open('app.css').read()
art=open('art.js').read()
logo=json.loads(art[len('const ART='):-2])['logo']
js='\n'.join(open(f).read() for f in ['art.js','art2.js','data.js','screens.js','overlays.js','flows.js','v2.js','qsheet.js','flowv.js','toastv.js','todov.js','agentsv.js','menuv.js','respv.js','msv.js','anv.js','restv.js','rules.js','app.js'])
s=s.replace('/*CSS*/',css).replace('/*LOGO*/',logo).replace('/*JS*/',js)
open('queryhawk-phone-v2.html','w').write(s)
print(len(s)//1024,'KB')
