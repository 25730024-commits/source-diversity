// 진입점: 모달·업로드·예시 데이터·결과 저장 (화면 ①②③ 연결)
const modal = document.getElementById('modal');
let lastResult = null;
let channelsCache = null;

function openModal() { modal.classList.add('show'); }
function closeModal() { modal.classList.remove('show'); }
function fileSelected(input) {
  document.getElementById('fileText').textContent = input.files[0]?.name || 'HTML, JSON 또는 ZIP 파일 선택';
}
function goResult() {
  if (document.body.classList.contains('has-result')) scrollToSection('result');
  else openModal();
}

// 채널 DB 불러오기 (fetch는 file:// 로 열면 막힘 → Live Server 또는 GitHub Pages 주소에서 실행)
async function loadChannels() {
  if (channelsCache) return channelsCache;
  try {
    const res = await fetch(CONFIG.CHANNELS_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    channelsCache = data.filter(c => c.id);
    return channelsCache;
  } catch (e) {
    alert('채널 DB(data/channels.json)를 불러오지 못했습니다.\nindex.html을 더블클릭해서 연 경우 동작하지 않습니다. VS Code Live Server 또는 GitHub Pages 주소에서 열어 주세요.');
    return null;
  }
}

async function runAnalysis(records) {
  const channels = await loadChannels();
  if (!channels) return;
  const result = analyze(records, channels);
  if (result.status === 'insufficient') {
    alert(`분석 데이터가 부족합니다.\n최근 ${CONFIG.PERIOD_MONTHS}개월 중 뉴스·시사 채널로 확인된 시청이 ${result.newsCount}건입니다. (최소 ${CONFIG.MIN_SAMPLE}건 필요)\n전체 ${result.rawCount.toLocaleString()}건 중 기간 밖 ${result.outOfPeriod}, DB 밖 ${result.unmatched}, 채널 정보 없음 ${result.noChannel}건이 제외되었습니다.`);
    return;
  }
  lastResult = result;
  renderResult(result);
  document.getElementById('save-btn').textContent = '결과 저장';
  closeModal();
}

// 업로드 파일(ZIP/HTML/JSON) → 기록 배열 → 분석
function analyzeFile() {
  const file = document.getElementById('file').files[0];
  if (!file) { alert('분석할 파일(.html, .json, .zip)을 선택해 주세요!'); return; }
  const name = file.name.toLowerCase();

  const fromText = (text, isHtml) => {
    try { return isHtml ? parseHTMLHistory(text) : parseJSONHistory(JSON.parse(text)); }
    catch (err) { alert('올바른 Takeout 시청기록 파일이 아닙니다.'); return null; }
  };

  if (name.endsWith('.zip')) {
    JSZip.loadAsync(file).then(zip => {
      let target = null, isHtml = false;
      zip.forEach((path, entry) => {
        const p = path.toLowerCase();
        if (p.endsWith('watch-history.json') || p.endsWith('시청 기록.json')) { target = entry; isHtml = false; }
        else if (!target && p.endsWith('.html')) { target = entry; isHtml = true; }
      });
      if (!target) { alert('ZIP 파일 안에서 시청 기록 파일(.html 또는 .json)을 찾을 수 없습니다.'); return; }
      target.async('string').then(text => { const rec = fromText(text, isHtml); if (rec) runAnalysis(rec); });
    }).catch(() => alert('ZIP 파일을 읽는 중 오류가 발생했습니다.'));
  } else if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = e => { const rec = fromText(e.target.result, !name.endsWith('.json')); if (rec) runAnalysis(rec); };
    reader.readAsText(file);
  } else {
    alert('지원하는 형식은 .html, .json, .zip 입니다.');
  }
}

// 예시 데이터 (직접 만든 가짜 기록)
async function loadSampleData() {
  try {
    const res = await fetch(CONFIG.SAMPLE_URL);
    if (!res.ok) throw new Error(res.status);
    runAnalysis(parseJSONHistory(await res.json()));
  } catch (e) {
    alert('예시 데이터를 불러오지 못했습니다. Live Server 또는 GitHub Pages 주소에서 열어 주세요.');
  }
}

// 결과 저장 (LocalStorage, 요약만)
function saveCurrentResult() {
  if (!lastResult) return;
  const ok = HistoryStore.add(makeHistoryEntry(lastResult));
  const btn = document.getElementById('save-btn');
  btn.textContent = ok ? '저장됨 ✓' : '저장 실패';
}

initHomeSections();
