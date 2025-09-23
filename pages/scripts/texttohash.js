    const base62chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const symbols = ['@', '#', '!', '$', '%', '&', '*'];

    async function generateHash() {
      const text = document.getElementById('inputText').value.trim();
      if (!text) return alert("!?");

      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      // Ubah ke BigInt
      let value = BigInt(0);
      for (let i = 0; i < hashArray.length; i++) {
        value = (value << 8n) + BigInt(hashArray[i]);
      }

      // Konversi ke base62
      let base62 = '';
      while (value > 0n && base62.length < 8) {
        base62 = base62chars[Number(value % 62n)] + base62;
        value = value / 62n;
      }

      // Ambil simbol awal & akhir berdasarkan hash isi
      const symbolStart = symbols[hashArray[0] % symbols.length];
      const symbolEnd   = symbols[hashArray[1] % symbols.length];

      // Gabungkan: simbol depan + base62 + simbol belakang
      const finalHash = symbolStart + base62.padStart(8, '0') + symbolEnd;

      document.getElementById('outputHash').value = finalHash;
    }

    function copyHash() {
      const output = document.getElementById('outputHash');
      output.select();
      document.execCommand("copy");
      alert("✅ Copied: " + output.value);
    }
