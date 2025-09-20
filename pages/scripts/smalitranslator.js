(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const input = $('#in');
  const output = $('#out');
  const hexDec = $('#hexDec');
  const comments = $('#comments');
  const btnRun = $('#run');
  const btnCopy = $('#copy');
  const btnClear = $('#clear');

  const TYPE_MAP = {
    'V':'void','Z':'boolean','B':'byte','S':'short','C':'char','I':'int','J':'long','F':'float','D':'double'
  };

  function mapObjType(sig){
    // e.g., Ljava/lang/String; → String
    if(!sig) return 'void';
    if(TYPE_MAP[sig]) return TYPE_MAP[sig];
    if(sig.startsWith('L') && sig.endsWith(';')){
      const raw = sig.slice(1,-1).replace(/\//g,'.');
      const simple = raw.split('.').pop();
      return simple || raw;
    }
    if(sig.startsWith('[')){
      return mapObjType(sig.slice(1)) + '[]';
    }
    return sig;
  }

  function parseParams(sig){
    // sig: e.g., Landroid/content/Context;Ljava/lang/String;Ljava/util/List;
    const params = [];
    for(let i=0;i<sig.length;){
      const ch = sig[i];
      if(TYPE_MAP[ch]){ params.push(TYPE_MAP[ch]); i+=1; continue; }
      if(ch==='L'){
        const j = sig.indexOf(';', i);
        params.push(mapObjType(sig.slice(i, j+1)));
        i = j+1; continue;
      }
      if(ch==='['){
        // array type
        let k=i; while(sig[k]==='[') k++;
        let t = TYPE_MAP[sig[k]] || mapObjType(sig.slice(k, sig.indexOf(';',k)+1));
        params.push((TYPE_MAP[sig[k]]?TYPE_MAP[sig[k]]:mapObjType(sig.slice(k, sig.indexOf(';',k)+1)))+'[]'.repeat(k-i));
        i = (TYPE_MAP[sig[k]]?k+1: sig.indexOf(';',k)+1);
        continue;
      }
      // unknown chunk
      i++;
    }
    return params;
  }

  function getLang(){
    const r = $$('input[name="lang"]').find(x=>x.checked);
    return r ? r.value : 'java';
  }

  function toCamel(name){
    return name.replace(/[^a-zA-Z0-9]+/g,' ').trim().replace(/\s+(.)/g,(m,g1)=>g1.toUpperCase());
  }

  function hexToDecAll(line){
    return line.replace(/0x[0-9a-fA-F]+/g, (m)=>{
      try{
        const val = parseInt(m,16);
        return String(val);
      }catch(_){return m}
    });
  }

  function mapKnownFlags(n){
    const x = Number(n);
    const parts = [];
    if(x & 0x10000000) parts.push('FLAG_ACTIVITY_NEW_TASK');
    if(x & 0x04000000) parts.push('FLAG_ACTIVITY_CLEAR_TOP');
    if(x & 0x20000000) parts.push('FLAG_ACTIVITY_SINGLE_TOP');
    return parts.length? ' // '+parts.join(' | '):'';
  }

  function translate(){
    const src = input.value.replace(/\r\n?/g,'\n');
    const lang = getLang();

    const lines = src.split('\n');
    const paramsByP = {}; // p1 → name
    let methodSig = null;
    let retType = 'void';
    let out = [];

    for(let i=0;i<lines.length;i++){
      let ln = lines[i].trim();
      if(!ln) continue;

      // .param pX, "name"
      let m = ln.match(/^\.param\s+p(\d+),\s+"([^"]+)"/);
      if(m){ paramsByP['p'+m[1]] = toCamel(m[2]); continue; }

      // .method header
      m = ln.match(/^\.method\s+([\w\s$-]*)\s+([\w$<>]+)([^)]*)([\wL;])?/);
      if(m){
        const mods = m[1].trim();
        const name = m[2];
        const paramSig = m[3]||'';
        const rSig = m[4]||'V';
        const paramTypes = parseParams(paramSig);
        retType = mapObjType(rSig);
        // Build params with names
        const params = [];
        for(let idx=0; idx<paramTypes.length; idx++){
          const pReg = 'p'+(idx+1); // typical, may differ on non-static
          const pname = paramsByP[pReg] || ('p'+(idx+1));
          params.push({type:paramTypes[idx], name:pname});
        }
        if(lang==='java'){
          out.push(`public ${mods.includes('static')?'static ':''}${mods.includes('final')?'final ':''}${retType} ${name}(${params.map(p=>p.type+' '+p.name).join(', ')}) {`);
        }else{
          out.push(`fun ${name}(${params.map(p=>`${p.name}: ${p.type}`).join(', ')}): ${retType} {`);
        }
        methodSig = {name};
        continue;
      }

      // return-void / return vX
      m = ln.match(/^return-void/);
      if(m){ out.push('  return;'); continue; }
      m = ln.match(/^return\s+(v\d+|p\d+)/);
      if(m){ out.push(`  return ${m[1]};`); continue; }

      // const-string vX, "..."
      m = ln.match(/^const-string\s+(v\d+),\s+"([\s\S]*?)"$/);
      if(m){
        const decl = lang==='java' ? `String ${m[1]} = "${m[2]}";` : `val ${m[1]}: String = "${m[2]}"`;
        out.push('  '+decl);
        continue;
      }

      // const/4 vX, N  or  const vX, 0x...
      m = ln.match(/^const(?:\/4|\/16|\/high16)?\s+(v\d+),\s+([\w-]+)$/);
      if(m){
        let val = m[2];
        let note = '';
        if(/^0x/i.test(val)){
          const dec = parseInt(val,16);
          if(hexDec.checked){ val = String(dec); }
          note = mapKnownFlags(dec);
        }
        const decl = lang==='java'? `int ${m[1]} = ${val};` : `var ${m[1]}: Int = ${val}`;
        out.push('  '+decl + (comments.checked? note:''));
        continue;
      }

      // invoke-static {args}, Lpkg/Cls;->method(sig)Ret
      m = ln.match(/^invoke-static\s+\{([^}]*)\},\s+L([^;]+);->([^(]+)\(([^)]*)([\wL;])/);
      if(m){
        const args = (m[1].trim()? m[1].split(/\s*,\s*/): []).join(', ');
        const cls = m[2].split('/').pop();
        const method = m[3];
        const call = `${cls}.${method}(${args})`;
        out.push('  '+call+';');
        continue;
      }

      // invoke-virtual {recv, args}, Lpkg/Cls;->method(sig)Ret
      m = ln.match(/^invoke-virtual\s+\{([^}]*)\},\s+L([^;]+);->([^(]+)\(([^)]*)([\wL;])/);
      if(m){
        const parts = m[1].trim()? m[1].split(/\s*,\s*/): [];
        const recv = parts.shift() || '/*recv*/';
        const args = parts.join(', ');
        const method = m[3];
        const call = `${recv}.${method}(${args})`;
        out.push('  '+call+';');
        continue;
      }

      // generic move-result into vX (best effort)
      m = ln.match(/^move-result(?:-object)?\s+(v\d+)/);
      if(m){ out.push(`  // ${m[1]} = <result of previous call>`); continue; }

      // labels / if / goto (emit as comment)
      if(/^:/.test(ln) || /^(if-\w+|goto)/.test(ln)){
        out.push('  // '+ln);
        continue;
      }

      // setFlags pattern hint
      m = ln.match(/^invoke-virtual\s+\{([^}]*)\},\s+Landroid\/content\/Intent;->setFlags\(ILandroid\/content\/Intent;/);
      if(m){
        const a = m[1].split(',').map(s=>s.trim());
        const recv = a[0];
        const flag = a[1]||'v?';
        out.push(`  ${recv}.setFlags(${flag});${comments.checked? '  // set intent flags':''}`);
        continue;
      }

      // fallback: keep as comment so user tidak kehilangan info
      out.push('  // '+ln);
    }

    if(methodSig){ out.push('}'); }

    let text = out.join('\n');
    if(hexDec.checked){ text = hexToDecAll(text); }
    output.value = text;
  }

  btnRun.addEventListener('click', translate);
  btnCopy.addEventListener('click', ()=>{ output.select(); document.execCommand('copy'); btnCopy.textContent='Copied'; setTimeout(()=>btnCopy.textContent='Copy',1000); });
  btnClear.addEventListener('click', ()=>{ input.value=''; output.value=''; });
})();
