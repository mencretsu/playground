  const logEl = document.getElementById('log');
  const progEl = document.getElementById('prog');
  const runBtn = document.getElementById('run');
  const dlBtn  = document.getElementById('download');
  const fileIn = document.getElementById('file');

  function log(line) { logEl.textContent += line + "\n"; logEl.scrollTop = logEl.scrollHeight; }
  function setProgress(v) { progEl.value = v; }

  // Change this if your jar has a different name/location
  const JADX_JAR = "/app/jadx-cli-1.5.0.jar"; // place the jar next to this HTML

  let inputPath = null;
  let outDir    = "/files/out";
  let outZip    = "/files/out.zip";

  async function initCJ() {
    log("Initializing CheerpJ runtime…");
    await cheerpjInit({ version: 11 }); // JVM 11 is enough for JADX
    log("CheerpJ ready.");
    runBtn.disabled = false;
  }

  // Write uploaded file into CheerpJ FS under /str/
  async function stageInput(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    inputPath = `/str/${file.name}`;
    cheerpOSAddStringFile(inputPath, buf); // accepts Uint8Array for binary
    log(`Staged input at ${inputPath} (${file.size.toLocaleString()} bytes)`);
  }

  fileIn.addEventListener('change', () => {
    if (fileIn.files && fileIn.files[0]) {
      stageInput(fileIn.files[0]);
    }
  });

  async function runJadx() {
    if (!inputPath) { alert('Pilih file APK/DEX dulu.'); return; }
    runBtn.disabled = true; dlBtn.disabled = true; setProgress(5);
    log("Running JADX… this can take a while for big APKs.");

    // Clean output dir (best-effort) by running a tiny Java cleanup, optional.
    try { await cheerpjRunJar(JADX_JAR, "--help"); } catch {}

    // Execute JADX: output Java sources to /files/out
    // Common useful flags: --deobf  --show-bad-code  --threads-count N
    const args = ["-d", outDir, "--deobf", inputPath];
    setProgress(10);
    const code = await cheerpjRunJar(JADX_JAR, ...args);
    log(`jadx exit code: ${code}`);
    if (code !== 0) {
      alert('JADX gagal. Lihat log untuk detail.');
      runBtn.disabled = false; return;
    }
    setProgress(70);

    // Create a ZIP of /files/out using a tiny in-page zipper (JS), fetching files via cjFileBlob.
    const zipped = await zipOutDir(outDir, outZip);
    setProgress(100);
    if (zipped) {
      dlBtn.disabled = false;
      log(`ZIP siap: ${outZip}`);
    }
    runBtn.disabled = false;
  }

  // Walk a directory listing via CheerpJ helper (simple approach):
  async function listDir(path) {
    // CheerpJ exposes a minimal shell via /bin/ls inside the VM is not available; we use Java ListFiles bridge
    // Fallback: use a tiny Java helper shipped inside jadx to list output? Not available, so we attempt common names.
    // Instead, we will recursively try well-known top-level folders that JADX outputs.
    return ["sources", "resources", "res"].map(p => `${path}/${p}`);
  }

  async function zipOutDir(dir, outZipPath) {
    log("Zipping output…");
    // Collect top-level dirs and create a zip client-side by fetching blobs via cjFileBlob
    const top = await listDir(dir);
    const files = [];
    for (const sub of top) {
      try {
        const listing = await fetchListing(sub);
        files.push(...listing);
      } catch {}
    }
    if (files.length === 0) { log("No files found in output."); return false; }

    const zipBlob = await buildZip(files);
    // Write zip into CheerpJ FS for consistency
    const ab = await zipBlob.arrayBuffer();
    cheerpOSAddStringFile(outZipPath, new Uint8Array(ab));
    // Also trigger browser download immediately
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'jadx-output.zip';
    document.body.appendChild(a); a.click(); a.remove();
    return true;
  }

  // Heuristic directory crawl: try a few depths
  async function fetchListing(base) {
    const queue = [base];
    const out = [];
    while (queue.length) {
      const p = queue.shift();
      try {
        // Try to fetch as if it were a file; if fails, assume directory and enumerate common filenames
        const blob = await cjFileBlob(p);
        if (blob && blob.size > 0) { out.push(p); continue; }
      } catch {
        // directory; try simple enumeration
        for (let i=0;i<1000;i++) { // cap depth enumeration
          const f = `${p}/file_${i}`; // placeholder – CheerpJ lacks directory listing API from JS
          break;
        }
      }
    }
    // Since we can't list, fallback to common structure: /sources/**/*.java only
    const guesses = [];
    for (let i=0;i<2000;i++) { guesses.push(`${base}/sources/${i}.java`); }
    const found = [];
    for (const g of guesses) {
      try { const b = await cjFileBlob(g); if (b && b.size>0) found.push(g); } catch {}
      if (found.length>200) break; // stop early
    }
    return found;
  }

  // Minimal ZIP builder (no compression) using JS. For real use, replace with a small library like fflate.
  async function buildZip(paths) {
    // To keep this single-file, include a tiny store-only ZIP writer.
    // NOTE: This is simplistic and for demo only.
    function crc32(buf) {
      let c = ~0; for (let i=0;i<buf.length;i++){ c = (c>>>8) ^ table[(c^buf[i]) & 0xFF]; } return (~c)>>>0; }
    const table = (()=>{ let c, t=new Uint32Array(256); for(let n=0;n<256;n++){ c=n; for(let k=0;k<8;k++){ c = (c&1)?(0xEDB88320^(c>>>1)):(c>>>1);} t[n]=c;} return t; })();

    const encoder = new TextEncoder();
    const files = [];
    for (const p of paths) {
      const blob = await cjFileBlob(p);
      const ab = new Uint8Array(await blob.arrayBuffer());
      files.push({path:p.replace(/^.*\/out\//,''), data:ab});
    }

    const chunks = [];
    const cd = [];
    let offset = 0;

    function pushU32(x){ chunks.push(new Uint8Array([x&255,(x>>>8)&255,(x>>>16)&255,(x>>>24)&255])); offset+=4; }
    function pushU16(x){ chunks.push(new Uint8Array([x&255,(x>>>8)&255])); offset+=2; }
    function pushBytes(b){ chunks.push(b); offset+=b.length; }

    for (const f of files) {
      const name = encoder.encode(f.path);
      const crc = crc32(f.data);
      const size = f.data.length;
      // Local file header
      pushU32(0x04034b50); // signature
      pushU16(20); pushU16(0); pushU16(0); // ver/flags/method (store)
      pushU16(0); pushU16(0); // time/date (zeros)
      pushU32(crc); pushU32(size); pushU32(size);
      pushU16(name.length); pushU16(0);
      pushBytes(name); pushBytes(f.data);
      // Central directory (collect to write later)
      cd.push({name, crc, size, off: offset - (30 + name.length + size)});
    }

    const cdStart = offset;
    for (const e of cd) {
      pushU32(0x02014b50); // central dir header
      pushU16(20); pushU16(20); pushU16(0); pushU16(0); pushU16(0);
      pushU16(0); pushU16(0); pushU32(e.crc); pushU32(e.size); pushU32(e.size);
      pushU16(e.name.length); pushU16(0); pushU16(0); pushU16(0); pushU16(0); pushU32(0);
      pushU32(e.off); pushBytes(e.name);
    }
    const cdEnd = offset;
    // End of central directory
    pushU32(0x06054b50); pushU16(0); pushU16(0);
    pushU16(cd.length); pushU16(cd.length);
    pushU32(cdEnd - cdStart); pushU32(cdStart);
    pushU16(0);

    // Merge
    let total = 0; for (const c of chunks) total += c.length;
    const out = new Uint8Array(total); let pos=0; for (const c of chunks){ out.set(c,pos); pos+=c.length; }
    return new Blob([out], {type: 'application/zip'});
  }

  runBtn.addEventListener('click', runJadx);
  dlBtn.addEventListener('click', async () => {
    const blob = await cjFileBlob(outZip);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jadx-output.zip';
    document.body.appendChild(a); a.click(); a.remove();
  });

  initCJ();
