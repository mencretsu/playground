    function generate() {
      let line = parseInt(document.getElementById("line").value);
      let hex = document.getElementById("hex").value.trim();

      if (hex.startsWith("0x") || hex.startsWith("0X")) {
        hex = hex.slice(2);
      }
      let hexNum = parseInt(hex, 16);

      let apis = document.getElementById("apiList").value
                   .split("\n")
                   .map(x => x.trim())
                   .filter(x => x);

      if (apis.length === 0) {
        alert("Isi dulu list API nya bro!");
        return;
      }

      let result = "";
      apis.forEach((api, i) => {
        let currentLine = line + i;
        let currentHex = "0x" + (hexNum + i).toString(16);

        result += `.line ${currentLine}\n`;
        result += `const-string v1, "${api}"\n\n`;
        result += `const/16 v2, ${currentHex}\n\n`;
        result += `aput-object v1, v0, v2\n\n`;
        result += `.line 5\n`;
        result += `nop\n\n`;
      });

      document.getElementById("output").textContent = result;
    }

    function copyOutput() {
      let text = document.getElementById("output").textContent;
      if (!text.trim()) {
        alert("Belum ada hasil untuk disalin!");
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ Berhasil disalin ke clipboard!");
      });
    }
