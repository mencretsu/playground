    const input = document.getElementById('input');
    const mode = document.getElementById('mode');
    const convertBtn = document.getElementById('convert');
    const swapBtn = document.getElementById('swap');
    const outHex = document.getElementById('outHex');
    const outDec = document.getElementById('outDec');
    const copyHex = document.getElementById('copyHex');
    const copyDec = document.getElementById('copyDec');

    function parseInput(str){
      if (!str) return null;
      str = str.trim();
      // handle sign
      let sign = 1;
      if (str.startsWith('-')){ sign = -1; str = str.slice(1).trim(); }

      // auto-detect hex
      const isHex = str.startsWith('0x') || /^[0-9a-fA-F]+$/.test(str) && /[a-fA-F]/.test(str);
      if (str.startsWith('0x')){
        const parsed = parseInt(str, 16);
        return {hex: '0x' + Math.abs(parsed).toString(16).toUpperCase(), dec: parsed * sign};
      }

      if (isHex && (mode.value==='auto' || mode.value==='hex-to-dec')){
        const parsed = parseInt(str, 16);
        return {hex: '0x' + Math.abs(parsed).toString(16).toUpperCase(), dec: parsed * sign};
      }

      // otherwise parse as decimal
      const num = Number(str);
      if (!Number.isFinite(num)) return null;
      const abs = Math.abs(num);
      const hex = '0x' + Math.floor(abs).toString(16).toUpperCase();
      return {hex: (num<0?'-':'') + hex, dec: Math.floor(num)};
    }

    function render(){
      const val = input.value;
      const parsed = parseInput(val);
      if (!parsed){ outHex.textContent = 'Hex: —'; outDec.textContent = 'Decimal: —'; return; }
      outHex.textContent = 'Hex: ' + parsed.hex;
      outDec.textContent = 'Decimal: ' + parsed.dec;
    }

    convertBtn.addEventListener('click', render);
    input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') render(); });

    swapBtn.addEventListener('click', ()=>{ input.value=''; render(); input.focus(); });

    copyHex.addEventListener('click', async ()=>{
      const text = outHex.textContent.replace('Hex: ','');
      try{ await navigator.clipboard.writeText(text); copyHex.textContent='Copied'; setTimeout(()=>copyHex.textContent='Copy Hex',1000);}catch(e){alert('Clipboard error')}
    });

    copyDec.addEventListener('click', async ()=>{
      const text = outDec.textContent.replace('Decimal: ','');
      try{ await navigator.clipboard.writeText(text); copyDec.textContent='Copied'; setTimeout(()=>copyDec.textContent='Copy Dec',1000);}catch(e){alert('Clipboard error')}
    });

    // auto render on input after short debounce
    let t;
    input.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(render,220); });

    // initial sample
    input.value = '0x14'; render();
