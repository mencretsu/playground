// ===== state & utils =====
let data = JSON.parse(localStorage.getItem('trackerData') || '[]');
const fmt = v => Number(v).toLocaleString('id-ID');
const toYMD = d => new Date(d).toISOString().split('T')[0];

document.getElementById('tanggal').value = toYMD(new Date());

const tbody = document.getElementById('dataTabel');
const btnTambah = document.getElementById('btnTambah');
const btnBackup = document.getElementById('btnBackup');
const fileRestore = document.getElementById('fileRestore');
const btnReset = document.getElementById('btnReset');

// ===== Chart.js setup =====
const ctx = document.getElementById('grafik').getContext('2d');
let chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Nilai Harian',
      data: [],
      borderColor: 'rgba(37,99,235,1)',
      backgroundColor: 'rgba(37,99,235,0.08)',
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const i = context.dataIndex;
            const val = context.parsed.y;
            if (i > 0) {
              const prev = context.dataset.data[i-1];
              const pct = prev === 0 ? 0 : ((val - prev) / prev * 100);
              const sign = pct >= 0 ? '+' : '';
              return `${fmt(val)} (${sign}${pct.toFixed(1)}%)`;
            }
            return fmt(val);
          }
        }
      }
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: { ticks: { callback: v => fmt(v) } }
    }
  }
});

// ===== render table, chart, summary =====
function renderAll() {
  data.sort((a,b) => a.tanggal > b.tanggal ? 1 : -1);
  localStorage.setItem('trackerData', JSON.stringify(data));

  // tabel
  tbody.innerHTML = '';
  data.forEach((d,i) => {
    const tr = document.createElement('tr');

    const hari = new Date(d.tanggal).toLocaleDateString('id-ID', { weekday: 'long' });
    const tdTgl = document.createElement('td');
    tdTgl.textContent = `${hari}, ${d.tanggal}`;
    tdTgl.ondblclick = () => {
      const inp = document.createElement('input'); inp.type='date'; inp.value=d.tanggal;
      inp.onblur = ()=>{ d.tanggal = inp.value || d.tanggal; renderAll(); };
      tdTgl.innerHTML=''; tdTgl.appendChild(inp); inp.focus();
    };

    const tdNil = document.createElement('td');
    tdNil.textContent = fmt(d.nilai);
    tdNil.ondblclick = () => {
      const inp = document.createElement('input'); inp.type='number'; inp.value=d.nilai;
      inp.onblur = ()=>{ d.nilai = parseInt(inp.value)||0; renderAll(); };
      tdNil.innerHTML=''; tdNil.appendChild(inp); inp.focus();
    };

    const tdPct = document.createElement('td');
    if (i > 0) {
      const prev = data[i-1].nilai;
      const pct = prev === 0 ? 0 : ((d.nilai - prev) / prev * 100);
      tdPct.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      tdPct.className = pct >= 0 ? 'persen-plus' : 'persen-minus';
    } else tdPct.textContent = '-';

    const tdAct = document.createElement('td');
    const del = document.createElement('span');
    del.textContent = '🗑️'; del.className = 'btn-hapus';
    del.onclick = ()=>{ if(confirm(`Hapus data ${d.tanggal}?`)){ data.splice(i,1); renderAll(); } };
    tdAct.appendChild(del);

    tr.appendChild(tdTgl); tr.appendChild(tdNil); tr.appendChild(tdPct); tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });

  // chart
  chart.data.labels = data.map(x => x.tanggal);
  chart.data.datasets[0].data = data.map(x => x.nilai);
  chart.update();

  // summary
  updateSummary();
}

function getWeekNumber(d) {
  const date = new Date(d);
  const firstMonday = new Date(date.getFullYear(), 0, 1);
  while (firstMonday.getDay() !== 1) {
    firstMonday.setDate(firstMonday.getDate() + 1);
  }
  const diff = (date - firstMonday) / (1000 * 60 * 60 * 24);
  return Math.floor(diff / 7) + 1;
}

function updateSummary() {
  const weekSum = {};
  const monthSum = {};

  data.forEach(d => {
    const week = getWeekNumber(d.tanggal);
    const month = new Date(d.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    weekSum[week] = (weekSum[week] || 0) + d.nilai;
    monthSum[month] = (monthSum[month] || 0) + d.nilai;
  });

  function renderTable(obj, tbodyId, labelPrefix) {
    const entries = Object.entries(obj).sort((a,b) => a[0] > b[0] ? 1 : -1);
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    let prev = null;
    entries.forEach(([key, total]) => {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.textContent = labelPrefix + ' ' + key;
      const tdTotal = document.createElement('td');
      tdTotal.textContent = fmt(total);
      const tdPct = document.createElement('td');
      if (prev !== null) {
        const pct = prev === 0 ? 0 : ((total - prev) / prev * 100);
        tdPct.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
        tdPct.className = pct >= 0 ? 'persen-plus' : 'persen-minus';
      } else tdPct.textContent = '-';
      tr.appendChild(tdLabel);
      tr.appendChild(tdTotal);
      tr.appendChild(tdPct);
      tbody.appendChild(tr);
      prev = total;
    });
  }

  renderTable(weekSum, 'sum-week', 'Minggu');
  renderTable(monthSum, 'sum-month', '');
}

// ===== events =====
btnTambah.onclick = () => {
  const t = document.getElementById('tanggal').value || toYMD(new Date());
  const v = parseInt(document.getElementById('nilai').value);
  if (isNaN(v)) return;
  data.push({ tanggal: t, nilai: v });
  document.getElementById('nilai').value = '';
  renderAll();
};

btnBackup.onclick = () => {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'tracker-backup.json'; a.click();
  URL.revokeObjectURL(url);
};

fileRestore.onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ()=> {
    try {
      const parsed = JSON.parse(r.result);
      if (!Array.isArray(parsed)) throw new Error('not array');
      data = parsed.map(x => ({ tanggal: x.tanggal, nilai: parseInt(x.nilai) || parseInt(x.value) || 0 }))
                   .filter(x => x.tanggal);
      renderAll();
    } catch (err) {
      alert('File rusak atau bukan JSON');
    }
  };
  r.readAsText(f);
};

btnReset.onclick = () => {
  if (confirm('Yakin reset semua data?')) { data = []; renderAll(); }
};

// ===== init =====
renderAll();
