const $ = (id) => document.getElementById(id);

function fillSelect(sel, items, placeholder) {
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder || "(chọn)";
  sel.appendChild(opt0);
  (items || []).forEach((x) => {
    const opt = document.createElement("option");
    opt.value = x;
    opt.textContent = x;
    sel.appendChild(opt);
  });
}

function setStatus(text, isWarn = false) {
  $("ankiPing").textContent = text;
  $("ankiPing").style.color = isWarn ? "#b91c1c" : "#16a34a";
}

async function ankiRequest(action, params = {}) {
  const resp = await chrome.runtime.sendMessage({ type: "ANKI_REQUEST", action, params });
  if (!resp || !resp.ok) throw new Error(resp?.error || "Failed to fetch (AnkiConnect)");
  return resp.result;
}

function collectMapping() {
  return {
    word: $("map_word").value,
    phonetic: $("map_phonetic").value,
    pos: $("map_pos").value,
    meanings: $("map_meanings").value,
    examples: $("map_examples").value,
    pageUrl: $("map_pageUrl").value,
    createdAt: $("map_createdAt").value,
  };
}

function applyFieldOptions(fields) {
  const ids = ["map_word","map_phonetic","map_pos","map_meanings","map_examples","map_pageUrl","map_createdAt"];
  ids.forEach((id) => fillSelect($(id), fields, "(bỏ qua)"));

  // defaults “thông minh”
  const byName = (names) => fields.find((f) => names.includes(f)) || "";
  $("map_word").value = byName(["Word","Front","Vocabulary","Term","Expression"]) || fields[0] || "";
  $("map_phonetic").value = byName(["Phonetic","IPA","Pronunciation"]) || "";
  $("map_pos").value = byName(["POS","PartOfSpeech","Part of speech","Type"]) || "";
  $("map_meanings").value = byName(["Meaning","Meanings","Definition","Vietnamese","Vi"]) || "";
  $("map_examples").value = byName(["Example","Examples","Sentence","Back"]) || "";
  $("map_pageUrl").value = byName(["Source","URL","PageUrl","Link"]) || "";
  $("map_createdAt").value = byName(["CreatedAt","Timestamp","Time"]) || "";
}

async function loadAnkiLists() {
  $("ankiWarn").style.display = "none";
  setStatus("đang kiểm tra…");

  try {
    await ankiRequest("version");
    setStatus("OK ✓ (đã kết nối AnkiConnect)");
  } catch (e) {
    setStatus("Không kết nối được", true);
    $("ankiWarn").style.display = "block";
    $("ankiWarn").textContent = "Không kết nối được AnkiConnect. Hãy mở Anki + cài AnkiConnect.";
    return;
  }

  const decks = await ankiRequest("deckNames");
  const models = await ankiRequest("modelNames");
  fillSelect($("ankiDeck"), decks, "(chọn deck)");
  fillSelect($("ankiModel"), models, "(chọn note type)");
}

async function loadSavedConfig() {
  const { anki_default_config } = await chrome.storage.local.get("anki_default_config");
  if (!anki_default_config) return;

  $("ankiDeck").value = anki_default_config.deck || "";
  $("ankiModel").value = anki_default_config.model || "";

  if (anki_default_config.model) {
    const fields = await ankiRequest("modelFieldNames", { modelName: anki_default_config.model });
    applyFieldOptions(fields || []);
    const m = anki_default_config.mapping || {};
    $("map_word").value = m.word || "";
    $("map_phonetic").value = m.phonetic || "";
    $("map_pos").value = m.pos || "";
    $("map_meanings").value = m.meanings || "";
    $("map_examples").value = m.examples || "";
    $("map_pageUrl").value = m.pageUrl || "";
    $("map_createdAt").value = m.createdAt || "";
  }
}

async function onModelChange() {
  const model = $("ankiModel").value;
  if (!model) return applyFieldOptions([]);
  const fields = await ankiRequest("modelFieldNames", { modelName: model });
  applyFieldOptions(fields || []);
}

async function saveConfig() {
  const deck = $("ankiDeck").value;
  const model = $("ankiModel").value;
  const mapping = collectMapping();

  if (!deck) return alert("Bạn chưa chọn Deck.");
  if (!model) return alert("Bạn chưa chọn Note type.");
  if (!mapping.word) return alert("Bạn phải map ít nhất field Word.");

  await chrome.storage.local.set({ anki_default_config: { deck, model, mapping } });
  alert("Đã lưu cấu hình Anki mặc định ✓");
}

(async function init(){
  $("btnReload").addEventListener("click", async () => {
    await loadAnkiLists();
    await loadSavedConfig();
  });

  $("ankiModel").addEventListener("change", onModelChange);
  $("btnSaveCfg").addEventListener("click", saveConfig);

  await loadAnkiLists();
  await loadSavedConfig();
})();
