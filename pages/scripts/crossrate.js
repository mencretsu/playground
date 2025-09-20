const currencies = ["AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD","HUF","IDR","ILS","INR","ISK","JPY","KRW","MXN","MYR","NOK","NZD","PHP","PLN","RON","SEK","SGD","THB","TRY","USD","ZAR"];

async function fetchRates(base) {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    return (await res.json()).rates;
}

async function updateRates() {
    const amountUSD = parseFloat(document.getElementById('usd').value) || 0;
    const feeDirect = parseFloat(document.getElementById('feeDirect').value) / 100 || 0;
    const feeIndirect = parseFloat(document.getElementById('feeIndirect').value) / 100 || 0;

    const usdRates = await fetchRates("USD");
    const idrRates = await fetchRates("IDR");

    const directRate = usdRates["IDR"] || null;
    const directIDR = directRate ? amountUSD * directRate * (1 - feeDirect) : 0;

    const tbody = document.querySelector('#ratesTable tbody');
    let rows = [];

    // Direct row
    rows.push({
        jalur: "USD → IDR",
        rate1: directRate?.toFixed(4) || '-',
        rate2: '-',
        hasil: directIDR ? directIDR.toLocaleString() : '-',
        selisih: '-',
        selisihNum: 0
    });

    // Indirect rows
    for (let cur of currencies) {
        if (cur === "USD" || cur === "IDR") continue;
        const rate1 = usdRates[cur] || null;
        const rate2 = idrRates[cur] ? 1 / idrRates[cur] : null;
        if (rate1 && rate2) {
            const received = amountUSD * rate1 * (1 - feeIndirect) * rate2 * (1 - feeIndirect);
            const diffNum = directIDR ? ((received - directIDR) / directIDR * 100) : null;
            const diffText = diffNum !== null ? diffNum.toFixed(2) + '%' : '-';
            rows.push({
                jalur: `USD → ${cur} → IDR`,
                rate1: rate1.toFixed(4),
                rate2: rate2.toFixed(4),
                hasil: received.toLocaleString(),
                selisih: diffText,
                selisihNum: diffNum
            });
        } else {
            rows.push({
                jalur: `USD → ${cur} → IDR`,
                rate1: rate1 ? rate1.toFixed(4) : '-',
                rate2: rate2 ? rate2.toFixed(4) : '-',
                hasil: '-',
                selisih: '-',
                selisihNum: 0
            });
        }
    }

    // Sort by selisihNum descending (most profitable first)
    rows.sort((a,b) => b.selisihNum - a.selisihNum);

    tbody.innerHTML = "";
    for (let r of rows) {
        const tr = document.createElement('tr');
        let cls = "";
        if (parseFloat(r.selisih) > 0) cls = "pos";
        else if (parseFloat(r.selisih) < 0) cls = "neg";
        tr.innerHTML = `<td>${r.jalur}</td>
                        <td>${r.rate1}</td>
                        <td>${r.rate2}</td>
                        <td>${r.hasil}</td>
                        <td class="${cls}">${r.selisih}</td>`;
        tbody.appendChild(tr);
    }
}

let timer;
function startAutoUpdate() {
    clearInterval(timer);
    updateRates();
    const sec = parseInt(document.getElementById('interval').value) * 1000;
    timer = setInterval(updateRates, sec);
}
document.querySelectorAll('input').forEach(inp => inp.addEventListener('change', startAutoUpdate));
startAutoUpdate();
