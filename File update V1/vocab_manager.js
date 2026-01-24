const KEY = "tempVocab";
const LIMIT = 500;
const ANKI_URL = "http://127.0.0.1:8765";

const $ = (id) => document.getElementById(id);

const state = {
  list: [],
  filtered: [],
  selectedIds: new Set(),
  editingId: null,
  anki: {
    decks: [],
    models: [],
    fields: [],
  }
};

function safeStr(v){ return (v == null) ? "" : String(v); }
function escapeHtml(s){ return safeStr(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c])); }
function fmtTime(ts){ try{return new Date(ts).toLocaleString();}catch{return "";} }

async function getList(){
  const data = await chrome.storage.local.get({ [KEY]: [] });
  const list = Array.isArray(data[KEY]) ? data[KEY] : [];
  return list.map(normalizeItem);
}
async function setList(list){
  await chrome.storage.local.set({ [KEY]: list.slice(0, LIMIT) });
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
    meanings: meanings.map(safeStr).filter(Boolean).slice(0,2),
    examples: examples.map(e => ({ en: safeStr(e?.en), vi: safeStr(e?.vi) })).filter(e => e.en || e.vi).slice(0,2),
    pageUrl: safeStr(x.pageUrl),
    createdAt: x.createdAt || Date.now(),
  };
}

function matchesQuery(item, q){
  if(!q) return true;
  const hay = [
    item.word, item.phonetic, item.pos,
    ...(item.meanings||[]),
    ...((item.examples||[]).flatMap(e => [e.en, e.vi])),
    item.pageUrl
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function shortUrl(u){ return safeStr(u).replace(/^https?:\/\//, ""); }

function renderChips(){
  $("chipTotal").textContent = `${state.filtered.length} từ`;
  $("chipSelected").textContent = `${state.selectedIds.size} chọn`;
  $("countText").textContent = `Tổng: ${state.filtered.length} / ${state.list.length}`;
  $("limitText").textContent = state.list.length;
  const pct = Math.min(100, Math.round((state.list.length / LIMIT) * 100));
  $("progressFill").style.width = `${pct}%`;
  $("btnDeleteSelected").disabled = state.selectedIds.size === 0;
}

function rowHtml(item){
  const meanings = item.meanings?.length
    ? `<ul class="bullets">${item.meanings.map(m=>`<li>${escapeHtml(m)}</li>`).join("")}</ul>`
    : `<span class="muted">—</span>`;

  const examples = item.examples?.length
    ? `<ul class="bullets examples">` + item.examples.map(ex => `
        <li>
          <div class="ex-en">${escapeHtml(ex.en || "—")}</div>
          ${ex.vi ? `<div class="ex-vi">${escapeHtml(ex.vi)}</div>` : ``}
        </li>`).join("") + `</ul>`
    : `<span class="muted">—</span>`;

  const pageCell = item.pageUrl
    ? `<a class="pageLink" href="${escapeHtml(item.pageUrl)}" target="_blank" title="${escapeHtml(item.pageUrl)}">${escapeHtml(shortUrl(item.pageUrl))}</a>`
    : `<span class="muted">—</span>`;

  const checked = state.selectedIds.has(item.id) ? "checked" : "";
  return `
    <tr data-id="${escapeHtml(item.id)}">
      <td class="col-check"><input class="rowCheck" type="checkbox" data-check="${escapeHtml(item.id)}" ${checked}></td>
      <td>
        <div class="vocab">
          <a class="wordLink" href="${escapeHtml('https://envi.jpdictionary.com/?word=' + encodeURIComponent(item.word || ''))}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(item.word || "")}
          </a>
          ${item.phonetic ? `<div class="phonetic">${escapeHtml(item.phonetic)}</div>` : `<div class="phonetic muted">—</div>`}
          ${item.pos ? `<div><span class="pos">${escapeHtml(item.pos)}</span></div>` : `<div class="muted">—</div>`}
        </div>
      </td>
      <td>${meanings}</td>
      <td>${examples}</td>
      <!-- POS moved into vocab column -->
      <td>${pageCell}</td>
      <td>
        <div class="rowActions">
          <button class="iconBtn edit" title="Sửa" aria-label="Sửa" data-edit="${escapeHtml(item.id)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
          <button class="iconBtn del" title="Xóa" aria-label="Xóa" data-del="${escapeHtml(item.id)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"/>
              <path d="M8 6V4h8v2"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M6 6l1 16h10l1-16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

async function render(){
  const q = safeStr($("q").value).trim().toLowerCase();
  state.filtered = state.list.filter(it => matchesQuery(it, q));
  $("tbody").innerHTML = state.filtered.map(rowHtml).join("");
  $("empty").style.display = state.filtered.length ? "none" : "block";

  const allChecked = state.filtered.length > 0 && state.filtered.every(x => state.selectedIds.has(x.id));
  $("checkAll").checked = allChecked;

  document.querySelectorAll("[data-check]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id = cb.getAttribute("data-check");
      if(cb.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      renderChips();
    });
  });

  document.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-del");
      state.list = state.list.filter(x=>x.id !== id);
      state.selectedIds.delete(id);
      await setList(state.list);
      await render();
      renderChips();
    });
  });

  document.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      openEdit(btn.getAttribute("data-edit"));
    });
  });

  renderChips();
}

function openEdit(id){
  const item = state.list.find(x=>x.id === id);
  if(!item) return;
  state.editingId = id;

  $("edWord").value = item.word || "";
  $("edPhonetic").value = item.phonetic || "";
  $("edPos").value = item.pos || "";
  $("edPage").value = item.pageUrl || "";
  $("edMeanings").value = (item.meanings || []).slice(0,2).join("\n");
  $("edExamples").value = (item.examples || []).slice(0,2).map(ex => `${ex.en || ""} || ${ex.vi || ""}`.trim()).join("\n");

  $("editDialog").showModal();
}

function closeEdit(){
  state.editingId = null;
  $("editDialog").close();
}

async function saveEdit(){
  const id = state.editingId;
  if(!id) return;
  const item = state.list.find(x=>x.id === id);
  if(!item) return;

  item.word = safeStr($("edWord").value).trim();
  item.phonetic = safeStr($("edPhonetic").value).trim();
  item.pos = safeStr($("edPos").value).trim();
  item.pageUrl = safeStr($("edPage").value).trim();

  item.meanings = safeStr($("edMeanings").value).split("\n").map(s=>s.trim()).filter(Boolean).slice(0,2);
  const lines = safeStr($("edExamples").value).split("\n").map(s=>s.trim()).filter(Boolean).slice(0,2);
  item.examples = lines.map(line=>{
    const parts = line.split("||").map(s=>s.trim());
    return { en: parts[0] || "", vi: parts[1] || "" };
  }).filter(ex => ex.en || ex.vi);

  await setList(state.list);
  closeEdit();
  await render();
}

async function refresh(){
  state.list = await getList();
  const ids = new Set(state.list.map(x=>x.id));
  state.selectedIds.forEach(id => { if(!ids.has(id)) state.selectedIds.delete(id); });
  await render();
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}

async function exportTXT(){
  const list = await getList();
  const lines = list.map(x => {
    const m = (x.meanings||[]).join(" | ");
    const ex = (x.examples||[]).map(e => `${e.en} :: ${e.vi}`.trim()).join(" | ");
    return `${x.word}\t${x.phonetic}\t${x.pos}\t${m}\t${ex}\t${x.pageUrl}`;
  });
  downloadText("envi_vocab.txt", lines.join("\n"));
}

async function exportCSV(){
  const list = await getList();
  const header = ["word","phonetic","pos","meanings","examples","pageUrl","createdAt"];
  const rows = list.map(x => {
    const meanings = (x.meanings||[]).join(" || ");
    const examples = (x.examples||[]).map(e => `${e.en} || ${e.vi}`.trim()).join(" ;; ");
    return [x.word, x.phonetic, x.pos, meanings, examples, x.pageUrl, String(x.createdAt)]
      .map(v => `"${safeStr(v).replace(/"/g,'""')}"`).join(",");
  });
  downloadText("envi_vocab.csv", [header.join(","), ...rows].join("\n"));
}

async function exportJSON(){
  const list = await getList();
  downloadText("envi_vocab.json", JSON.stringify({ version: 1, exportedAt: Date.now(), items: list }, null, 2));
}

function dedupeKey(x){
  return [safeStr(x.word).toLowerCase(), safeStr(x.phonetic), safeStr(x.pos).toLowerCase()].join("|");
}

async function importJSON(file){
  const text = await file.text();
  let obj;
  try{ obj = JSON.parse(text); }catch{ alert("File JSON không hợp lệ."); return; }
  const items = Array.isArray(obj) ? obj : (Array.isArray(obj.items) ? obj.items : []);
  const incoming = items.map(normalizeItem);

  const current = await getList();
  const map = new Map();
  current.forEach(it => map.set(dedupeKey(it), it));
  incoming.forEach(it => {
    const k = dedupeKey(it);
    if(!map.has(k)) map.set(k, it);
    else{
      const old = map.get(k);
      old.meanings = (old.meanings?.length ? old.meanings : it.meanings).slice(0,2);
      old.examples = (old.examples?.length ? old.examples : it.examples).slice(0,2);
      if(!old.pageUrl && it.pageUrl) old.pageUrl = it.pageUrl;
      if(!old.pos && it.pos) old.pos = it.pos;
      if(!old.phonetic && it.phonetic) old.phonetic = it.phonetic;
    }
  });

  const merged = Array.from(map.values()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0, LIMIT);
  await setList(merged);
  await refresh();
  alert(`Đã nhập: ${incoming.length} mục. Tổng hiện tại: ${merged.length}.`);
}

async function deleteSelected(){
  if(state.selectedIds.size === 0) return;
  if(!confirm(`Xóa ${state.selectedIds.size} từ đã chọn?`)) return;
  const del = new Set(state.selectedIds);
  state.list = state.list.filter(x => !del.has(x.id));
  state.selectedIds.clear();
  await setList(state.list);
  await render();
}

async function clearAll(){
  if(!confirm("Xóa toàn bộ từ đã lưu?")) return;
  state.list = [];
  state.selectedIds.clear();
  await setList([]);
  await render();
}

/* -------------------- AnkiConnect -------------------- */
async function ankiRequest(action, params = {}){
  const payload = { action, version: 6, params };
  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function setAnkiStatus(text, isWarn=false){
  const el = $("ankiPing");
  el.textContent = text;
  el.className = isWarn ? "warn" : "";
}

function fillSelect(selectEl, options, placeholder="(chọn)"){
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);
  options.forEach(o=>{
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    selectEl.appendChild(opt);
  });
}

function getScopeItems(){
  const scope = $("ankiScope").value;
  if(scope === "all") return state.list;
  if(scope === "filtered") return state.filtered;
  // selected
  const sel = new Set(state.selectedIds);
  return state.list.filter(x => sel.has(x.id));
}

function toAnkiFields(item){
  const meanings = (item.meanings || []).slice(0,2).join("<br>");
  const examples = (item.examples || []).slice(0,2).map(ex=>{
    const en = escapeHtml(ex.en || "");
    const vi = escapeHtml(ex.vi || "");
    return vi ? `${en}<br><span style="color:#6b7280;font-size:12px;">${vi}</span>` : en;
  }).join("<br><br>");

  return {
    word: item.word || "",
    phonetic: item.phonetic || "",
    pos: item.pos || "",
    meanings,
    examples,
    pageUrl: item.pageUrl || "",
    createdAt: String(item.createdAt || ""),
  };
}

function collectMapping(){
  const mapping = {
    word: $("map_word").value,
    phonetic: $("map_phonetic").value,
    pos: $("map_pos").value,
    meanings: $("map_meanings").value,
    examples: $("map_examples").value,
    pageUrl: $("map_pageUrl").value,
    createdAt: $("map_createdAt").value,
  };
  return mapping;
}

function validateMapping(mapping){
  // Require at least word mapped
  if(!mapping.word) return "Bạn phải map ít nhất field Word.";
  return null;
}

function applyFieldOptions(fields){
  const ids = ["map_word","map_phonetic","map_pos","map_meanings","map_examples","map_pageUrl","map_createdAt"];
  ids.forEach(id => fillSelect($(id), fields, "(bỏ qua)"));

  // sensible defaults
  const byName = (names) => fields.find(f => names.includes(f)) || "";
  $("map_word").value = byName(["Word","Front","Vocabulary","Term","Expression"]) || fields[0] || "";
  $("map_phonetic").value = byName(["Phonetic","IPA","Pronunciation"]) || "";
  $("map_pos").value = byName(["POS","PartOfSpeech","Part of speech","Type"]) || "";
  $("map_meanings").value = byName(["Meaning","Meanings","Definition","Vietnamese","Vi"]) || "";
  $("map_examples").value = byName(["Example","Examples","Sentence","Back"]) || "";
  $("map_pageUrl").value = byName(["Source","URL","PageUrl","Link"]) || "";
  $("map_createdAt").value = byName(["CreatedAt","Timestamp","Time"]) || "";
}

async function openAnkiDialog(){
  $("ankiWarn").style.display = "none";
  setAnkiStatus("đang kiểm tra…");

  try{
    await ankiRequest("version");
    setAnkiStatus("OK ✓ (đã kết nối AnkiConnect)");
  }catch(err){
    setAnkiStatus("Không kết nối được (hãy mở Anki + cài AnkiConnect)", true);
    $("ankiWarn").style.display = "block";
    $("ankiWarn").textContent = "Không kết nối được AnkiConnect. Hãy: (1) mở Anki, (2) cài add-on AnkiConnect, (3) thử lại.";
    // still open dialog so user can see message
  }

  try{
    const decks = await ankiRequest("deckNames");
    const models = await ankiRequest("modelNames");
    state.anki.decks = decks || [];
    state.anki.models = models || [];
    fillSelect($("ankiDeck"), state.anki.decks, "(chọn deck)");
    fillSelect($("ankiModel"), state.anki.models, "(chọn note type)");
  }catch(err){
    $("ankiWarn").style.display = "block";
    $("ankiWarn").textContent = "Không lấy được danh sách deck/note type. Kiểm tra AnkiConnect.";
  }

  // default scope
  $("ankiScope").value = state.selectedIds.size ? "selected" : "filtered";

  $("ankiDialog").showModal();
}

async function onModelChange(){
  const model = $("ankiModel").value;
  if(!model) { applyFieldOptions([]); return; }
  try{
    const fields = await ankiRequest("modelFieldNames", { modelName: model });
    state.anki.fields = fields || [];
    applyFieldOptions(state.anki.fields);
  }catch(err){
    $("ankiWarn").style.display = "block";
    $("ankiWarn").textContent = "Không lấy được fields của note type. Kiểm tra AnkiConnect.";
  }
}

async function saveToAnki(){
  $("ankiWarn").style.display = "none";
  const deck = $("ankiDeck").value;
  const model = $("ankiModel").value;
  const mapping = collectMapping();

  if(!deck){ $("ankiWarn").style.display="block"; $("ankiWarn").textContent="Bạn chưa chọn Deck."; return; }
  if(!model){ $("ankiWarn").style.display="block"; $("ankiWarn").textContent="Bạn chưa chọn Note type."; return; }
  const msg = validateMapping(mapping);
  if(msg){ $("ankiWarn").style.display="block"; $("ankiWarn").textContent=msg; return; }

  const items = getScopeItems();
  if(items.length === 0){
    $("ankiWarn").style.display="block";
    $("ankiWarn").textContent="Không có từ nào để nhập (hãy chọn scope khác hoặc tick chọn từ).";
    return;
  }

  // build notes
  const notes = items.map(it=>{
    const src = toAnkiFields(it);
    const fields = {};
    Object.entries(mapping).forEach(([k, ankiField])=>{
      if(ankiField) fields[ankiField] = src[k] ?? "";
    });
    return {
      deckName: deck,
      modelName: model,
      fields,
      options: { allowDuplicate: true },
      tags: ["ENVI"]
    };
  });

  try{
    // Batch add
    const result = await ankiRequest("addNotes", { notes });
    const ok = result.filter(x => x !== null && x !== null).length;
    alert(`Đã gửi ${notes.length} note. Thành công: ${ok}.`);
    closeAnki();
  }catch(err){
    $("ankiWarn").style.display="block";
    $("ankiWarn").textContent = "Lỗi khi addNotes: " + err.message;
  }
}

function closeAnki(){
  $("ankiDialog").close();
}

/* -------------------- Bind -------------------- */
function bind(){
  $("btnRefresh").addEventListener("click", refresh);
  $("q").addEventListener("input", render);

  $("checkAll").addEventListener("change", ()=>{
    const checked = $("checkAll").checked;
    state.filtered.forEach(it=>{
      if(checked) state.selectedIds.add(it.id);
      else state.selectedIds.delete(it.id);
    });
    render();
  });

  $("btnDeleteSelected").addEventListener("click", deleteSelected);
  $("btnClearAll").addEventListener("click", clearAll);

  $("btnExportTXT").addEventListener("click", exportTXT);
  $("btnExportCSV").addEventListener("click", exportCSV);
  $("btnExportJSON").addEventListener("click", exportJSON);

  $("fileImport").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    e.target.value = "";
    if(file) await importJSON(file);
  });

  $("btnCloseDialog").addEventListener("click", closeEdit);
  $("btnCancel").addEventListener("click", closeEdit);
  $("btnSave").addEventListener("click", saveEdit);
  $("editDialog").addEventListener("close", ()=>{ state.editingId = null; });

  // Anki
  $("btnAnki").addEventListener("click", openAnkiDialog);
  $("btnCloseAnki").addEventListener("click", closeAnki);
  $("btnAnkiCancel").addEventListener("click", closeAnki);
  $("btnAnkiSave").addEventListener("click", saveToAnki);
  $("ankiModel").addEventListener("change", onModelChange);

  $("ankiDialog").addEventListener("close", ()=>{ /* noop */ });
}

bind();
refresh();
