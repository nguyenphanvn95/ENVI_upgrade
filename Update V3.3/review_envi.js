// review_envi.js
const KEY = "tempVocab";
const DEFAULT_SETTINGS = {
  frontMain: "word",
  backMain: "meaningAll",
  showFrontPos: true,
  showFrontIpa: true,
  showFrontAudio: true,
  showFrontExamples: true,
  showBackPos: true,
  showBackIpa: true,
  showBackAudio: true,
  showBackDefinition: true,
  showBackExamples: true,
  showBackSource: true,
};

let items = [];
let idx = 0;
let flipped = false;
let settings = { ...DEFAULT_SETTINGS };

function $(id){ return document.getElementById(id); }

function safeStr(v){ return (v == null) ? "" : String(v); }
function escapeHtml(s){
  return safeStr(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function normalizeItem(x){
  const meanings = Array.isArray(x.meanings) ? x.meanings : (x.meaning ? [x.meaning] : (x.translated ? [x.translated] : []));
  const examples = Array.isArray(x.examples) ? x.examples : [];
  const ex0_en = x.example_en || "";
  const ex0_vi = x.example_vi || "";
  if (!examples.length && (ex0_en || ex0_vi)){
    examples.push({ en: ex0_en, vi: ex0_vi });
  }
  return {
    id: x.id || (Date.now() + "_" + Math.random().toString(16).slice(2)),
    word: safeStr(x.word),
    phonetic: safeStr(x.phonetic),
    pos: safeStr(x.pos),
    definition: safeStr(x.definition),
    meanings: meanings.map(safeStr).filter(Boolean).slice(0,2),
    examples: examples.map(e => ({ en: safeStr(e?.en), vi: safeStr(e?.vi) })).filter(e => e.en || e.vi).slice(0,2),
    pageUrl: safeStr(x.pageUrl),
    createdAt: x.createdAt || Date.now(),
  };
}

async function loadData(){
  const store = await chrome.storage.local.get({ [KEY]: [], envi_review_settings: DEFAULT_SETTINGS });
  const raw = Array.isArray(store[KEY]) ? store[KEY] : [];
  items = raw.map(normalizeItem);
  settings = { ...DEFAULT_SETTINGS, ...(store.envi_review_settings || {}) };
  idx = 0;
  flipped = false;
  render();
  syncSettingsUI();
}

function getMainText(it, key){
  if(!it) return "";
  switch(key){
    case "word": return it.word || "";
    case "meaning1": return (it.meanings && it.meanings[0]) ? it.meanings[0] : "";
    case "meaningAll": return (it.meanings || []).join("\n");
    case "definition": return it.definition || "";
    case "example_en": return (it.examples && it.examples[0]) ? (it.examples[0].en || "") : "";
    case "example_vi": return (it.examples && it.examples[0]) ? (it.examples[0].vi || "") : "";
    default: return "";
  }
}

function shortUrl(u){ return safeStr(u).replace(/^https?:\/\//, ""); }

function renderExamples(exArr){
  const ex = Array.isArray(exArr) ? exArr.slice(0,2) : [];
  return ex.map(e => {
    const en = escapeHtml(e.en || "—");
    const vi = e.vi ? `<div class="vi">${escapeHtml(e.vi)}</div>` : "";
    return `<div class="ex"><div>${en}</div>${vi}</div>`;
  }).join("");
}

function renderBackExtras(it){
  const blocks = [];
  if(settings.showBackDefinition && it?.definition){
    blocks.push(`
      <div class="block">
        <div class="block-title">Giải thích</div>
        <div class="block-body">${escapeHtml(it.definition)}</div>
      </div>
    `);
  }
  if(settings.showBackExamples && it?.examples?.length){
    blocks.push(`
      <div class="block">
        <div class="block-title">Ví dụ</div>
        <div class="block-body">${renderExamples(it.examples)}</div>
      </div>
    `);
  }
  return blocks.join("");
}

function render(){
  $("counter").textContent = items.length ? `${idx+1} / ${items.length}` : "0 / 0";
  const it = items[idx] || null;

  const card = $("flashcard");
  card.classList.toggle("flipped", flipped);

  // FRONT
  $("frontMain").textContent = getMainText(it, settings.frontMain) || "";
  $("frontPos").textContent = settings.showFrontPos ? (it?.pos || "") : "";
  $("frontIpa").textContent = settings.showFrontIpa ? (it?.phonetic || "") : "";

  const frontExamplesEl = $("frontExamples");
  frontExamplesEl.innerHTML = "";
  if(settings.showFrontExamples && it?.examples?.length){
    frontExamplesEl.innerHTML = renderExamples(it.examples);
  }

  // BACK
  $("backMain").textContent = getMainText(it, settings.backMain) || "";
  $("backExtras").innerHTML = renderBackExtras(it);

  // SOURCE
  const hasSource = !!(it?.pageUrl);
  $("sourceBlock").style.display = (settings.showBackSource && hasSource) ? "block" : "none";
  if(hasSource){
    $("sourceLink").href = it.pageUrl;
    $("sourceLink").textContent = shortUrl(it.pageUrl);
    $("sourceLink").title = it.pageUrl;
  }

  // AUDIO
  const btnAudio = $("btnAudio");
  btnAudio.style.display = (settings.showFrontAudio || settings.showBackAudio) ? "inline-block" : "none";
  btnAudio.onclick = () => playAudio(it);
}

function flip(){
  flipped = !flipped;
  render();
}
function next(){
  if(!items.length) return;
  idx = (idx + 1) % items.length;
  flipped = false;
  render();
}
function prev(){
  if(!items.length) return;
  idx = (idx - 1 + items.length) % items.length;
  flipped = false;
  render();
}

async function playAudio(it){
  const audioEl = $("audioEl");
  const url = it?.audio_url;
  if(url){
    audioEl.src = url;
    try{ await audioEl.play(); }catch(_){}
    return;
  }
  const utter = new SpeechSynthesisUtterance(it?.word || "");
  utter.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function openModal(){ $("modal").classList.remove("hidden"); }
function closeModal(){ $("modal").classList.add("hidden"); }

function syncSettingsUI(){
  $("frontMainSelect").value = settings.frontMain;
  $("backMainSelect").value = settings.backMain;

  $("toggleFrontPos").checked = !!settings.showFrontPos;
  $("toggleFrontIpa").checked = !!settings.showFrontIpa;
  $("toggleFrontAudio").checked = !!settings.showFrontAudio;
  $("toggleFrontExamples").checked = !!settings.showFrontExamples;

  $("toggleBackPos").checked = !!settings.showBackPos;
  $("toggleBackIpa").checked = !!settings.showBackIpa;
  $("toggleBackAudio").checked = !!settings.showBackAudio;
  if($("toggleBackDefinition")) $("toggleBackDefinition").checked = !!settings.showBackDefinition;
  $("toggleBackExamples").checked = !!settings.showBackExamples;
  $("toggleBackSource").checked = !!settings.showBackSource;
}

async function saveSettingsFromUI(){
  settings.frontMain = $("frontMainSelect").value;
  settings.backMain = $("backMainSelect").value;

  settings.showFrontPos = $("toggleFrontPos").checked;
  settings.showFrontIpa = $("toggleFrontIpa").checked;
  settings.showFrontAudio = $("toggleFrontAudio").checked;
  settings.showFrontExamples = $("toggleFrontExamples").checked;

  settings.showBackPos = $("toggleBackPos").checked;
  settings.showBackIpa = $("toggleBackIpa").checked;
  settings.showBackAudio = $("toggleBackAudio").checked;
  settings.showBackDefinition = $("toggleBackDefinition") ? $("toggleBackDefinition").checked : true;
  settings.showBackExamples = $("toggleBackExamples").checked;
  settings.showBackSource = $("toggleBackSource").checked;

  await chrome.storage.local.set({ envi_review_settings: settings });
  render();
}

function bindEvents(){
  $("btnBack").onclick = () => { window.location.href = "vocab_manager.html"; };
  $("btnPrev").onclick = prev;
  $("btnNext").onclick = next;

  $("btnSettings").onclick = openModal;
  $("btnCloseModal").onclick = closeModal;
  $("modalBackdrop").onclick = closeModal;

  $("btnSaveSettings").onclick = async () => {
    await saveSettingsFromUI();
    closeModal();
  };

  $("flashcard").addEventListener("click", flip);

  window.addEventListener("keydown", (e)=>{
    const modalOpen = !$("modal").classList.contains("hidden");
    if(modalOpen){
      if(e.key === "Escape") closeModal();
      return;
    }
    if(e.key === " " || e.code === "Space"){ e.preventDefault(); flip(); return; }
    if(e.key === "ArrowRight"){ next(); return; }
    if(e.key === "ArrowLeft"){ prev(); return; }
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindEvents();
  await loadData();
});
