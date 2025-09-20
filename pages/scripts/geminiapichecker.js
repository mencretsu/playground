async function cekBanyak() {
    const statusEl = document.getElementById('status');
    const keysText = document.getElementById('apiKeys').value.trim();
    const delayMs = parseInt(document.getElementById('delay').value) || 500;
    const progressBar = document.getElementById('progressBar');

    if(!keysText) {
        statusEl.textContent = "Masukin minimal 1 API key bro!";
        return;
    }

    const keys = keysText.split("\n").map(k=>k.trim()).filter(k=>k);
    statusEl.textContent = "Checking " + keys.length + " API key...\n\n";

    let countActive = 0, countError = 0, countRateLimit = 0;

    for(let i=0; i<keys.length; i++){
        const key = keys[i];

        try {
            const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-goog-api-key": key
                },
                body: JSON.stringify({ contents: [{ parts: [{ text: "" }] }] })
            });

            const rateLimit = res.headers.get('X-RateLimit-Limit') || 'n/a';
            const rateRemaining = res.headers.get('X-RateLimit-Remaining') || 'n/a';
            const rateReset = res.headers.get('X-RateLimit-Reset') || 'n/a';
            const info = `(Kuota: ${rateRemaining}/${rateLimit}, Reset: ${rateReset})`;

            if(res.status === 200) {
                statusEl.textContent += `✅ Aktif: ${key} ${info}\n`;
                countActive++;
            } else if(res.status === 429) {
                statusEl.textContent += `⚠ Rate Limit: ${key} ${info}\n`;
                countRateLimit++;
            } else {
                statusEl.textContent += `❌ Error: ${key} (Status ${res.status}) ${info}\n`;
                countError++;
            }

        } catch(err) {
            statusEl.textContent += `❌ Error: ${key} (${err.message})\n`;
            countError++;
        }

        // update progress bar
        const percent = Math.round(((i+1)/keys.length)*100);
        progressBar.style.width = percent + "%";
        progressBar.textContent = percent + "%";

        // delay tiap request
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // summary gampang dibaca
    statusEl.textContent += `\n📝 Summary:\nTotal akun: ${keys.length}\nAktif: ${countActive}\nError: ${countError}\nRate Limit: ${countRateLimit}`;
}
