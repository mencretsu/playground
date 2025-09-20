    function formatRupiah(angka) {
      return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function parseInput(input) {
      return parseInt(input.replace(/\./g, '')) || 0;
    }

    function formatInput(el) {
      const val = el.value.replace(/\./g, '').replace(/\D/g, '');
      el.value = formatRupiah(val);
    }

    function hitung() {
      const asset = parseInput(document.getElementById("asset").value);
      const entry = parseInput(document.getElementById("entry").value);
      const payout = parseFloat(document.getElementById("payout").value);
      const multiplier = parseFloat(document.getElementById("multiplier").value);

      let detail = "";
      let current = entry;
      let step = 0;
      let remainMinus = asset;
      let remainPlus = asset;

      detail += `
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Amount</th>
              <th>Profit Session</th>
              <th>Return</th>
              <th>Remaining (-)</th>
              <th>Remaining (+)</th>
            </tr>
          </thead>
          <tbody>
      `;

      while (remainMinus >= current) {
        const profit = Math.floor(current * payout) - current;
        const totalReturn = current + profit;

        remainMinus -= current;
        remainPlus = remainMinus + totalReturn;

        detail += `<tr>
          <td>Step ${step + 1}</td>
          <td> ${formatRupiah(current)}</td>
          <td> ${formatRupiah(profit)}</td>
          <td> ${formatRupiah(totalReturn)}</td>
          <td> ${formatRupiah(remainMinus)}</td>
          <td> ${formatRupiah(remainPlus)}</td>
        </tr>`;

        current = Math.floor(current * multiplier);
        step++;
      }

      detail += "</tbody></table>";

      const nextStepCost = Math.floor(entry * Math.pow(multiplier, step));
      const totalNextAsset = asset + nextStepCost - remainMinus;
      const tambahanAsset = totalNextAsset - asset;

      const nextInfo = `<div id="next-step-info">
        <em>Untuk lanjut ke step berikutnya, butuh tambahan <strong> ${formatRupiah(tambahanAsset)}</strong><br>
        (total asset yang dibutuhin: <strong> ${formatRupiah(totalNextAsset)}</strong>)</em>
      </div>`;

      document.getElementById("result").innerHTML = detail + nextInfo;
    }
