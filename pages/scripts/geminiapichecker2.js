const $ = (sel) => document.querySelector(sel);

function maskKey(key){
  if(!key) return '';
  return key.slice(0,5)+'…'+key.slice(-4);
}

async function probeKey(key, endpoint, mode){
  const url = new URL(endpoint);
  let init = { method:'GET', mode:'cors' };
  if(mode==='key') url.searchParams.set('key', key);
  else init.headers = { 'Authorization':'Bearer '+key };

  let projectNumber=null, status='OK';
  try {
    const res = await fetch(url.toString(), init);
    const hdr = res.headers.get('x-goog-project-number');
    if(hdr) projectNumber = hdr.trim();
    let data=null; try{data=await res.clone().json();}catch{}
    if(!projectNumber && data && data.error && data.error.message){
      const m=String(data.error.message).match(/project\s(\d{6,})/i);
      if(m) projectNumber=m[1];
      status='Error';
    }
    if(!projectNumber && res.ok) status='OK';
    if(!res.ok && status==='OK') status='Error';
  }catch(err){ status='Network'; }
  return { key, projectNumber, status };
}

$('#sample').addEventListener('click',()=>{
  $('#keys').value=['AIzaSyA********1111','AIzaSyB********2222'].join('\n');
});

$('#run').addEventListener('click',async()=>{
  const keys=$('#keys').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(keys.length===0){alert('Isi dulu API key.');return;}
  $('#run').disabled=true;$('#run').textContent='Ngecek…';
  const endpoint=$('#endpoint').value.trim();
  const mode=$('#mode').value;

  const result=$('#result');
  result.innerHTML='';
  for(let i=0;i<keys.length;i++){
    const r=await probeKey(keys[i],endpoint,mode);
    const div=document.createElement('div');
    div.className='card';
    div.innerHTML=`
      <div><b>Key #${i+1}</b></div>
      <div class="mono">${maskKey(r.key)}</div>
      <div>Project: <span class="mono">${r.projectNumber||'-'}</span></div>
      <div>Status: <span class="pill ${r.status==='OK'?'ok':(r.status==='Error'?'warn':'err')}">${r.status}</span></div>
    `;
    result.appendChild(div);
  }
  $('#run').disabled=false;$('#run').textContent='Cek Project';
});
