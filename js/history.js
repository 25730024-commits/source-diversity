// 진단 이력 화면 (화면 ④): 목록·삭제·HHI 변화 그래프
let trendChart = null;

function renderHistory() {
  const list = HistoryStore.load();
  const tbody = document.getElementById('hist-body');
  tbody.innerHTML = '';
  document.getElementById('hist-empty').style.display = list.length ? 'none' : 'block';
  document.getElementById('clear-btn').style.display = list.length ? '' : 'none';

  list.forEach(e => {
    const tr = document.createElement('tr');
    const cells = [
      new Date(e.savedAt).toLocaleDateString(),
      e.hhi.toLocaleString(),
      `${e.lv} ${e.grade}`,
      `${e.cr3}%`,
      `${e.newsCount.toLocaleString()}회`,
      e.top.slice(0, 3).map(c => `${c.name} ${c.share}%`).join(', ')
    ];
    cells.forEach(t => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
    const tdDel = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'del'; btn.textContent = '삭제';
    btn.onclick = () => { HistoryStore.remove(e.id); renderHistory(); };
    tdDel.appendChild(btn); tr.appendChild(tdDel);
    tbody.appendChild(tr);
  });

  const note = document.getElementById('trend-note');
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  document.getElementById('trend').style.display = list.length >= 2 ? '' : 'none';
  note.textContent = list.length >= 2 ? '' : '진단을 2회 이상 저장하면 변화 그래프가 표시됩니다.';
  if (list.length >= 2 && window.Chart) {
    const asc = [...list].reverse();
    trendChart = new Chart(document.getElementById('trend'), {
      type: 'line',
      data: { labels: asc.map(e => new Date(e.savedAt).toLocaleDateString()),
              datasets: [{ label: 'HHI', data: asc.map(e => e.hhi), borderColor: '#0B1F3A', backgroundColor: '#0B1F3A', tension: 0.2 }] },
      options: { scales: { y: { min: 0, max: 10000 } } }
    });
  }
}

document.getElementById('clear-btn').onclick = () => {
  if (confirm('저장된 진단 이력을 모두 삭제할까요?')) { HistoryStore.clear(); renderHistory(); }
};
renderHistory();
