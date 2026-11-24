const STORE_KEY = 'slovolesye.words.v1';
const TEST_KEY = 'slovolesye.weekly-test.v1';
const labels = { new: 'Новое', no: 'Пока не помню', recognize: 'Узнаю', translate: 'Помню перевод', speech: 'Использую в речи' };
const topicNames = { daily: 'Повседневное', travel: 'Путешествия', work: 'Работа', other: 'Другое' };
const irregularVerbs = {
  be:['is','was','been','being'], become:['becomes','became','become','becoming'], begin:['begins','began','begun','beginning'], break:['breaks','broke','broken','breaking'], bring:['brings','brought','brought','bringing'], build:['builds','built','built','building'], buy:['buys','bought','bought','buying'], catch:['catches','caught','caught','catching'], choose:['chooses','chose','chosen','choosing'], come:['comes','came','come','coming'], do:['does','did','done','doing'], drink:['drinks','drank','drunk','drinking'], drive:['drives','drove','driven','driving'], eat:['eats','ate','eaten','eating'], fall:['falls','fell','fallen','falling'], feel:['feels','felt','felt','feeling'], find:['finds','found','found','finding'], fly:['flies','flew','flown','flying'], forget:['forgets','forgot','forgotten','forgetting'], get:['gets','got','got','getting'], give:['gives','gave','given','giving'], go:['goes','went','gone','going'], grow:['grows','grew','grown','growing'], have:['has','had','had','having'], hear:['hears','heard','heard','hearing'], keep:['keeps','kept','kept','keeping'], know:['knows','knew','known','knowing'], leave:['leaves','left','left','leaving'], lose:['loses','lost','lost','losing'], make:['makes','made','made','making'], meet:['meets','met','met','meeting'], pay:['pays','paid','paid','paying'], read:['reads','read','read','reading'], ride:['rides','rode','ridden','riding'], run:['runs','ran','run','running'], say:['says','said','said','saying'], see:['sees','saw','seen','seeing'], sell:['sells','sold','sold','selling'], send:['sends','sent','sent','sending'], sit:['sits','sat','sat','sitting'], sleep:['sleeps','slept','slept','sleeping'], speak:['speaks','spoke','spoken','speaking'], spend:['spends','spent','spent','spending'], stand:['stands','stood','stood','standing'], swim:['swims','swam','swum','swimming'], take:['takes','took','taken','taking'], teach:['teaches','taught','taught','teaching'], tell:['tells','told','told','telling'], think:['thinks','thought','thought','thinking'], wear:['wears','wore','worn','wearing'], win:['wins','won','won','winning'], write:['writes','wrote','written','writing']
};
const irregularNouns = { child:'children', person:'people', man:'men', woman:'women', tooth:'teeth', foot:'feet', mouse:'mice', goose:'geese', ox:'oxen' };
let words = readWords();
let activeFolder = 'all';
let activeTopic = 'all';
let studyDeck = [];
let studyIndex = 0;
let testQuestions = [];
let testIndex = 0;
let testScore = 0;

function readWords() {
  try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(saved) ? saved : []; }
  catch { return []; }
}
function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(words)); }
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function go(id) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === id));
  const tab = ['study','test'].includes(id) ? 'practice' : id === 'detail' ? 'cards' : id;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.go === tab));
  document.getElementById('fab').style.display = id === 'cards' ? 'block' : 'none';
  if (id === 'cards') renderWords();
  if (id === 'practice') updatePracticeScreen();
  window.scrollTo({top:0, behavior:'smooth'});
}
function toast(message) {
  const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}
function setTopic(topic, button) {
  activeTopic = topic;
  document.querySelectorAll('#topic-chips .chip').forEach(el => el.classList.toggle('selected', el === button));
  renderWords();
}
function filterFolder(level) {
  activeFolder = level;
  document.querySelectorAll('.folder').forEach(el => el.classList.toggle('active-folder', el.dataset.folder === level));
  const reset = document.getElementById('clear-folder');
  reset.style.display = 'inline';
  reset.textContent = level === 'all' ? 'Архив' : 'Сбросить';
  reset.onclick = () => filterFolder(level === 'all' ? 'archived' : 'all');
  const title = level === 'all' ? 'Все слова · A—Z' : level === 'archived' ? 'Выученные · архив' : `${labels[level]} · A—Z`;
  document.getElementById('list-title').textContent = title;
  renderWords();
  document.getElementById('word-list').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderWords() {
  const reset = document.getElementById('clear-folder');
  if (activeFolder === 'all') { reset.style.display = 'inline'; reset.textContent = 'Архив'; reset.onclick = () => filterFolder('archived'); }
  else { reset.style.display = 'inline'; reset.textContent = 'Сбросить'; reset.onclick = () => filterFolder('all'); }
  const query = (document.getElementById('search')?.value || '').trim().toLocaleLowerCase();
  const list = words.filter(word => {
    const archiveMatch = activeFolder === 'archived' ? word.archived : !word.archived;
    const levelMatch = activeFolder === 'all' || activeFolder === 'archived' || word.level === activeFolder;
    const topicMatch = activeTopic === 'all' || word.topic === activeTopic;
    const searchMatch = !query || `${word.word} ${word.translation}`.toLocaleLowerCase().includes(query);
    return archiveMatch && levelMatch && topicMatch && searchMatch;
  }).sort((a,b) => a.word.localeCompare(b.word, 'en', {sensitivity:'base'}));
  const box = document.getElementById('word-list');
  box.innerHTML = list.length ? list.map(word => `<button class="word-row" onclick="openDetail('${esc(word.id)}')"><span class="word-letter">${esc(word.word.slice(0,1).toUpperCase())}</span><span class="word-info"><strong>${esc(word.word)}</strong><span>${esc(word.translation)}</span></span><i class="word-level level-${esc(word.level)}"></i></button>`).join('') : `<div class="empty">${words.length ? 'В этой папке пока пусто. Выбери другую папку или добавь слово 🌲' : 'Здесь пока пусто. Добавь первое слово, которое хочешь запомнить 🌱'}</div>`;
}
function openAdd() { document.getElementById('add-modal').classList.add('open'); setTimeout(() => document.getElementById('new-word').focus(), 100); }
function closeAdd() { document.getElementById('add-modal').classList.remove('open'); }
async function lookup(word) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {signal:controller.signal});
    if (!response.ok) return null;
    const data = await response.json(); const entry = data[0];
    const meaning = entry.meanings?.[0]; const definition = meaning?.definitions?.find(item => item.example) || meaning?.definitions?.[0];
    const phonetic = entry.phonetics?.find(item => item.text)?.text || entry.phonetic || '';
    const audio = entry.phonetics?.find(item => item.audio)?.audio || '';
    return {pos:meaning?.partOfSpeech || '', definition:definition?.definition || '', example:definition?.example || '', phonetic, audio};
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
function inferPartOfSpeech(dictionary) { return dictionary?.pos || 'другое'; }
function getForms(word, pos) {
  const w = word.toLowerCase();
  if (pos === 'verb') {
    if (irregularVerbs[w]) { const [third,past,participle,ing] = irregularVerbs[w]; return {'Начальная форма':w,'He / She':third,'Прошедшее время':past,'Причастие':participle,'Форма -ing':ing}; }
    const third = /[^aeiou]y$/.test(w) ? w.slice(0,-1)+'ies' : /(s|sh|ch|x|z|o)$/.test(w) ? w+'es' : w+'s';
    const cvc = w.length <= 4 && /[^aeiou][aeiou][^aeiouwxy]$/.test(w);
    const past = /[^aeiou]y$/.test(w) ? w.slice(0,-1)+'ied' : /e$/.test(w) ? w+'d' : cvc ? w+w.slice(-1)+'ed' : w+'ed';
    const ing = /ie$/.test(w) ? w.slice(0,-2)+'ying' : /e$/.test(w) && !/ee$/.test(w) ? w.slice(0,-1)+'ing' : cvc ? w+w.slice(-1)+'ing' : w+'ing';
    return {'Начальная форма':w,'He / She':third,'Прошедшее время':past,'Причастие':past,'Форма -ing':ing};
  }
  if (pos === 'noun') {
    const plural = irregularNouns[w] || (/[^aeiou]y$/.test(w) ? w.slice(0,-1)+'ies' : /(s|sh|ch|x|z)$/.test(w) ? w+'es' : w+'s');
    return {'Единственное число':w,'Множественное число':plural};
  }
  if (pos === 'adjective') {
    if (w.length > 7 || /(ful|ous|ing|ive|able|less|ic)$/.test(w)) return {'Обычная форма':w,'Сравнительная степень':`more ${w}`,'Превосходная степень':`most ${w}`};
    const comp = /y$/.test(w) ? w.slice(0,-1)+'ier' : /e$/.test(w) ? w+'r' : w+'er';
    const sup = /y$/.test(w) ? w.slice(0,-1)+'iest' : /e$/.test(w) ? w+'st' : w+'est';
    return {'Обычная форма':w,'Сравнительная степень':comp,'Превосходная степень':sup};
  }
  return {};
}
function makeExamples(word, pos, forms) {
  if (word.toLowerCase() === 'be' && pos === 'verb') return ['I am here.','She is here.','I am not here.','Are you here?'];
  if (pos === 'verb') return [`I ${word} every day.`, `She ${forms['He / She']} every day.`, `I do not ${word}.`, `Do you ${word}?`];
  if (pos === 'noun') { const plural = forms['Множественное число'] || word+'s'; return [`I found one ${word}.`, `I found two ${plural}.`]; }
  if (pos === 'adjective') { const comparative = forms['Сравнительная степень'] || `more ${word}`; const superlative = forms['Превосходная степень'] || `most ${word}`; return [`The path is ${word}.`, `This path is ${comparative}.`, `It is the ${superlative} path.`]; }
  return [];
}
async function saveWord(event) {
  event.preventDefault();
  const word = document.getElementById('new-word').value.trim().toLowerCase();
  const translation = document.getElementById('new-translation').value.trim();
  if (words.some(item => item.word.toLocaleLowerCase() === word)) { toast('Это слово уже есть в картотеке'); return; }
  const submit = event.currentTarget.querySelector('[type="submit"]'); const original = submit.textContent;
  submit.disabled = true; submit.textContent = 'ИЩУ СЛОВАРНУЮ СПРАВКУ…';
  const dictionary = await lookup(word); const pos = inferPartOfSpeech(dictionary); const forms = getForms(word, pos);
  const item = {id:uid(), word, translation, topic:document.getElementById('new-topic').value, level:'new', archived:false, pos, phonetic:dictionary?.phonetic || '', audio:dictionary?.audio || '', definition:dictionary?.definition || '', examples:dictionary?.example ? [dictionary.example] : makeExamples(word,pos,forms), forms, addedAt:Date.now(), reviews:0};
  words.push(item); persist(); renderWords(); event.currentTarget.reset(); closeAdd(); submit.disabled = false; submit.textContent = original;
  toast(dictionary ? 'Карточка заполнена и сохранена' : 'Слово сохранено; справку можно поправить вручную');
}
function openDetail(id) {
  const item = words.find(word => word.id === id); if (!item) return;
  document.getElementById('detail-word').dataset.id = item.id;
  document.getElementById('detail-word').textContent = item.word;
  document.getElementById('detail-translation').textContent = item.translation;
  document.getElementById('detail-tag').textContent = `${item.pos || 'другое'} · ${topicNames[item.topic] || 'Другое'}`.toUpperCase();
  document.getElementById('detail-level').textContent = (item.archived ? 'Выучено · архив' : labels[item.level] || labels.new).toUpperCase();
  const pronunciation = document.querySelector('#detail .detail-head .sub');
  pronunciation.innerHTML = `${item.phonetic ? esc(item.phonetic) : 'Произношение не найдено'} ${item.audio ? `<button class="text-btn" onclick="playAudio('${esc(item.id)}')">▶ слушать</button>` : ''}`;
  const forms = Object.entries(item.forms || {});
  document.getElementById('detail-forms').innerHTML = forms.length ? forms.map(([label,value]) => `<div class="form-pill"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('') : '<div class="sub">Для этого слова отдельные формы не требуются.</div>';
  const examples = item.examples || [];
  const exampleBlock = document.getElementById('detail-example');
  exampleBlock.innerHTML = examples.length ? examples.map(line => `<div class="example">${highlightWord(line,item.word)}</div>`).join('') : '<div class="sub">Пример не найден. Его можно добавить вручную.</div>';
  const definition = document.getElementById('detail-definition');
  if (definition) definition.textContent = item.definition || 'Словарное определение не найдено.';
  document.getElementById('detail-edit').innerHTML = `<details><summary>Поправить автозаполнение</summary><form class="edit-fields" onsubmit="saveDetails(event,'${esc(item.id)}')"><label>Перевод<input name="translation" value="${esc(item.translation || '')}" required></label><label>Часть речи<input name="pos" value="${esc(item.pos || '')}"></label><label>Транскрипция<input name="phonetic" value="${esc(item.phonetic || '')}"></label><label>Формы <span>по одной на строке: Название: форма</span><textarea name="forms">${esc(forms.map(([k,v])=>`${k}: ${v}`).join('\n'))}</textarea></label><label>Примеры <span>по одному на строке</span><textarea name="examples">${esc(examples.join('\n'))}</textarea></label><label>Определение на английском<textarea name="definition">${esc(item.definition || '')}</textarea></label><button class="primary small" type="submit">Сохранить справку</button></form></details>`;
  const actions = document.querySelector('#detail .detail-actions');
  actions.innerHTML = `${item.archived ? '<button class="secondary" onclick="restoreWord()">↶ Вернуть в картотеку</button>' : '<button class="secondary" onclick="archiveWord()">✓ Выучено</button>'}<button class="secondary" onclick="confirmDelete()">⌫ Удалить</button>`;
  go('detail');
}
function highlightWord(sentence, word) {
  const safe = esc(sentence); const escapedWord = esc(word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return safe.replace(new RegExp(`(${escapedWord})`, 'gi'), '<b>$1</b>');
}
function saveDetails(event,id) {
  event.preventDefault(); const item = words.find(word => word.id === id); if (!item) return;
  const form = new FormData(event.currentTarget); item.translation = String(form.get('translation') || '').trim(); item.pos = String(form.get('pos') || '').trim(); item.phonetic = String(form.get('phonetic') || '').trim();
  item.forms = Object.fromEntries(String(form.get('forms') || '').split('\n').map(line => line.split(':')).filter(parts => parts.length > 1).map(parts => [parts.shift().trim(),parts.join(':').trim()]).filter(([k,v]) => k && v));
  item.examples = String(form.get('examples') || '').split('\n').map(line => line.trim()).filter(Boolean); item.definition = String(form.get('definition') || '').trim();
  persist(); renderWords(); openDetail(id); toast('Справка сохранена');
}
function playAudio(id) { const item = words.find(word => word.id === id); if (!item?.audio) return; const audio = new Audio(item.audio.startsWith('//') ? `https:${item.audio}` : item.audio); audio.play().catch(() => toast('Не удалось воспроизвести аудио')); }
function archiveWord() {
  const id = document.getElementById('detail-word').dataset.id;
  const item = words.find(word => word.id === id); if (!item) return;
  item.archived = true; item.level = 'speech'; persist(); filterFolder('all'); go('cards'); toast('Слово отправлено в архив выученных');
}
function restoreWord() {
  const id = document.getElementById('detail-word').dataset.id;
  const item = words.find(word => word.id === id); if (!item) return;
  item.archived = false; item.level = item.level || 'speech'; persist(); go('cards'); toast('Слово возвращено в картотеку');
}
function confirmDelete() {
  const id = document.getElementById('detail-word').dataset.id;
  if (!confirm('Удалить слово и его карточку с этого устройства?')) return;
  words = words.filter(word => word.id !== id); persist(); go('cards'); toast('Слово удалено');
}
function prepareStudy() {
  if (!words.filter(item => !item.archived).length) { toast('Сначала добавь слова в картотеку'); go('cards'); return; }
  const pool = words.filter(item => !item.archived);
  const weighted = pool.flatMap(item => Array.from({length: item.level === 'new' || item.level === 'no' ? 4 : item.level === 'recognize' ? 3 : item.level === 'translate' ? 2 : 1}, () => item));
  studyDeck = [...new Set(weighted.sort(() => Math.random() - .5))].sort((a,b) => (a.reviews || 0) - (b.reviews || 0)).slice(0,Math.min(10,pool.length)).sort(() => Math.random()-.5);
  studyIndex = 0; showStudyWord(); go('study');
}
function showStudyWord() {
  const item = studyDeck[studyIndex]; if (!item) return;
  document.getElementById('flash-word').textContent = item.word;
  document.getElementById('flash-translations').textContent = item.translation;
  document.getElementById('study-index').textContent = `СЛОВО ${studyIndex+1} ИЗ ${studyDeck.length}`;
  document.getElementById('flash-card').classList.remove('flipped');
}
function flipCard() { document.getElementById('flash-card').classList.toggle('flipped'); }
function nextWord() {
  studyIndex++;
  if (studyIndex >= studyDeck.length) { toast('На сегодня всё. Хорошая работа!'); go('practice'); return; }
  showStudyWord();
}
function rateWord(level) {
  const item = studyDeck[studyIndex]; if (!item) return;
  item.level = level; item.reviews = (item.reviews || 0) + 1; item.lastReviewed = Date.now(); persist();
  toast(`В папке «${labels[level]}»`); nextWord();
}
function updatePracticeScreen() {
  const empty = words.every(item => item.archived);
  const start = document.getElementById('start-practice');
  if (start) { start.disabled = empty; start.style.opacity = empty ? '.55' : '1'; start.title = empty ? 'Добавь сначала несколько слов' : ''; }
  const weekly = document.getElementById('weekly-copy');
  if (weekly) {
    const last = Number(localStorage.getItem(TEST_KEY) || 0); const due = !last || Date.now() - last >= 7*24*60*60*1000;
    weekly.innerHTML = `<strong>${due ? 'Пора на недельную проверку' : 'Недельная проверка'}</strong><span>${due ? 'Слова из всех папок · короткий тест' : 'Проверь, как слова закрепились'}</span>`;
  }
}
function beginWeeklyTest() {
  const pool = words.filter(item => !item.archived);
  if (pool.length < 2) { toast('Добавь хотя бы два слова для проверки'); go('cards'); return; }
  const weighted = pool.flatMap(item => Array.from({length: item.level === 'new' || item.level === 'no' ? 4 : item.level === 'recognize' ? 3 : item.level === 'translate' ? 2 : 1}, () => item));
  testQuestions = [...new Set(weighted.sort(() => Math.random()-.5))].slice(0,Math.min(10,pool.length)).map(item => {
    const wrong = pool.filter(other => other.id !== item.id).sort(() => Math.random()-.5).slice(0,3).map(other => other.translation);
    const answers = [...new Set([item.translation,...wrong])].sort(() => Math.random()-.5);
    return {item, answers, correct:answers.indexOf(item.translation)};
  });
  testIndex = 0; testScore = 0;
  document.getElementById('test-intro').style.display = 'none'; document.getElementById('test-run').style.display = 'block'; document.getElementById('test-result').style.display = 'none';
  showTestQuestion(); go('test');
}
function showTestQuestion() {
  const question = testQuestions[testIndex]; if (!question) return;
  document.getElementById('question-word').textContent = question.item.word;
  document.getElementById('test-progress').textContent = `ВОПРОС ${testIndex+1} ИЗ ${testQuestions.length}`;
  document.getElementById('test-steps').innerHTML = testQuestions.map((_,index) => `<i class="${index<testIndex?'done':''}"></i>`).join('');
  document.getElementById('answer-list').innerHTML = question.answers.map((answer,index) => `<button class="answer-option" onclick="answerTest(${index})">${String.fromCharCode(65+index)}. &nbsp;${esc(answer)}</button>`).join('');
}
function answerTest(index) {
  const question = testQuestions[testIndex]; const options = document.querySelectorAll('.answer-option');
  options.forEach((button,position) => { if (position === question.correct) button.classList.add('correct'); button.disabled = true; });
  if (index === question.correct) {
    testScore++;
    if (question.item.level === 'new') question.item.level = 'recognize';
    else if (question.item.level === 'recognize') question.item.level = 'translate';
  } else question.item.level = 'no';
  persist();
  setTimeout(() => {
    testIndex++;
    if (testIndex < testQuestions.length) { showTestQuestion(); return; }
    document.getElementById('test-run').style.display = 'none'; document.getElementById('test-result').style.display = 'block';
    document.getElementById('result-score').textContent = `${testScore}/${testQuestions.length}`;
    document.getElementById('result-message').textContent = testScore === testQuestions.length ? 'Все ответы верные. Эти слова можно считать уверенно знакомыми.' : 'Слова с ошибками вернулись в папку «Пока не помню» и встретятся в практике чаще.';
    localStorage.setItem(TEST_KEY, String(Date.now())); updatePracticeScreen();
  },550);
}
function exportWords() {
  const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), words},null,2)],{type:'application/json'});
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `slovolesye-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); toast('Резервная копия скачана');
}
function openBackup() { document.getElementById('backup-modal').classList.add('open'); }
function importWords(event) {
  const file = event.target.files?.[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result); const incoming = Array.isArray(parsed) ? parsed : parsed.words;
      if (!Array.isArray(incoming)) throw new Error();
      const known = new Set(words.map(item => item.word.toLowerCase()));
      incoming.forEach(item => { if (item.word && !known.has(item.word.toLowerCase())) words.push({...item,id:item.id || uid()}); });
      persist(); renderWords(); document.getElementById('backup-modal').classList.remove('open'); toast('Слова из копии добавлены');
    } catch { toast('Не удалось прочитать файл копии'); }
    event.target.value='';
  }; reader.readAsText(file);
}
function closeBackup() { document.getElementById('backup-modal').classList.remove('open'); }
function init() {
  document.querySelectorAll('.modal-backdrop.open').forEach(modal => modal.classList.remove('open'));
  renderWords(); updatePracticeScreen();
  document.getElementById('detail-word').dataset.id = '';
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  document.addEventListener('keydown',event=>{ if (event.key==='Escape') { closeAdd(); closeBackup(); } });
  const originalOpenDetail = openDetail;
  window.openDetail = function(id) { const item=words.find(word=>word.id===id); if(item) document.getElementById('detail-word').dataset.id=item.id; originalOpenDetail(id); };
  window.prepareStudy = prepareStudy; window.beginWeeklyTest = beginWeeklyTest;
}
init();
