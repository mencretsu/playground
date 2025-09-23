    function tambahBaris() {
      const container = document.getElementById('inputList');
      const div = document.createElement('div');
      div.className = 'baris';
      div.innerHTML = `
        <input type="number" placeholder="Watt" class="watt">
        <input type="number" placeholder="Jumlah" class="jumlah">
      `;
      container.appendChild(div);
    }

    function hitung() {
      const wattInputs = document.querySelectorAll('.watt');
      const jumlahInputs = document.querySelectorAll('.jumlah');
      const jam = parseFloat(document.getElementById('jam').value);
      const tarif = parseFloat(document.getElementById('tarif').value);

      let totalWatt = 0;

      for (let i = 0; i < wattInputs.length; i++) {
        const watt = parseFloat(wattInputs[i].value);
        const jumlah = parseInt(jumlahInputs[i].value);
        if (!isNaN(watt) && !isNaN(jumlah)) {
          totalWatt += watt * jumlah;
        }
      }

      const kwh = (totalWatt * jam) / 1000;
      const biayaHarian = kwh * tarif;
      const biayaBulanan = biayaHarian * 30;

      document.getElementById('hasil').innerHTML = `
        ⚙️ Total Watt: <b>${totalWatt} W</b><br>
        ⚡ Konsumsi per Hari: <b>${kwh.toFixed(2)} kWh</b><br>
        💰 Biaya Harian: <b>Rp ${biayaHarian.toLocaleString()}</b><br>
        📆 Biaya Bulanan: <b>Rp ${biayaBulanan.toLocaleString()}</b>
      `;
    }
