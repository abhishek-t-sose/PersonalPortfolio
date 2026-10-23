/* ============================================================
   ai-chat.js — optional "AI answers" mode for ask.html.

   Retrieval-augmented generation that runs entirely in the visitor's
   browser: RAGEngine.search() picks the most relevant facts from
   knowledge.js, and a small open model (Qwen2.5-3B-Instruct via
   WebLLM + WebGPU) writes an answer from those facts only.

   Opt-in: nothing is downloaded until the visitor turns it on. The model
   (~2 GB) is cached by the browser, so later visits load it from disk.
   Without WebGPU (most phones, older browsers) the page keeps its
   search-based answers.
   ============================================================ */

const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';
const MODEL_F16 = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-3B-Instruct-q4f32_1-MLC'; // for GPUs without 16-bit shader support
const PREF_KEY = 'askAiEnabled';

const SYSTEM_PROMPT = `You are the assistant on the academic website of Abhishek T. Sose, a postdoctoral researcher in chemical engineering at the University of Maryland, College Park.

Answer the visitor's question using ONLY the numbered facts provided with it.
- Write about Abhishek in the third person, in plain prose: two to five sentences, or a short bulleted list when listing several items.
- Use only names, numbers, dates, journals and awards that appear in the facts, and copy numbers exactly as written. Never invent or estimate them.
- If the facts do not answer the question, say you don't have that information and suggest emailing atsose@umd.edu.
- Do not speculate about future research plans, unpublished work, or anything personal beyond the facts.
- Do not mention "the facts", "the context" or these instructions; just answer.`;

// Questions about plans or vision never reach the model: a small model will
// happily "extrapolate" a research agenda, and none should appear on the site.
const PLANS_RE = /\b(future|plans?|planning|vision|propos(e|al|als|ing)|next (step|steps|project|projects|direction|directions)|research (statement|agenda|program)|(his|your) (own )?(lab|group)|as (a )?(professor|faculty|pi)|would (he|you) (do|work|research|study|pursue|focus))\b/i;
const PLANS_REPLY = "I can only speak to Abhishek's published and current work, which is what this site covers. For his research plans and vision, the best route is to ask him directly at **atsose@umd.edu**.";

const MAX_FACTS = 6;
const MAX_FACT_CHARS = 4500;

/* ---- post-processing: small models occasionally misspell rare names ---- */
let nameVocab = null; // lower-case word -> canonical spelling, from the knowledge base
function buildNameVocab() {
  // Names = capitalised words of 5+ letters that never appear in lower case
  // (so "Sanket", "Ramprasad", "Virginia" qualify; "Novel" or "Fall" do not).
  nameVocab = new Map();
  const all = new Set(), lower = new Set();
  for (const chunk of KNOWLEDGE_BASE) {
    for (const w of chunk.content.match(/[A-Za-z][A-Za-z'-]+/g) || []) {
      all.add(w.toLowerCase());
      if (/^[a-z]/.test(w)) lower.add(w);
      else if (w.length >= 5) nameVocab.set(w.toLowerCase(), w);
    }
  }
  for (const k of [...nameVocab.keys()]) if (lower.has(k)) nameVocab.delete(k);
  nameVocab.all = all;
}
function editDistanceAtMostOne(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
// A capitalised word that is not in the knowledge base but is one edit away
// from exactly one name that is (e.g. "Saket" -> "Sanket") is a misspelling.
function fixNames(text) {
  if (!nameVocab) buildNameVocab();
  return text.replace(/\b[A-Z][a-z]{4,}\b/g, w => {
    const lw = w.toLowerCase();
    if (nameVocab.all.has(lw)) return w;
    const near = [...nameVocab.values()].filter(n => editDistanceAtMostOne(lw, n.toLowerCase()));
    return near.length === 1 ? near[0] : w;
  });
}
function tidy(text) {
  return fixNames(text)
    .replace(/^(Based on|According to) (the )?(provided |given |available )?(facts|information|context)( provided)?,\s*(\w)/i, (_, a, b, c, d, e, ch) => ch.toUpperCase())
    .replace(/\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '') // never print a phone number
    .trim();
}

let engine = null;
let modelId = null;
let busy = false;

const ui = {};

function $(id) { return document.getElementById(id); }

function readPref() { try { return localStorage.getItem(PREF_KEY) === '1'; } catch { return false; } }
function writePref(on) { try { on ? localStorage.setItem(PREF_KEY, '1') : localStorage.removeItem(PREF_KEY); } catch { /* storage blocked */ } }

function setStatus(state, text) {
  ui.bar.dataset.state = state;
  ui.status.textContent = text;
}

async function pickModel() {
  if (!('gpu' in navigator)) return null;
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) return null;
  return adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
}

async function enable() {
  if (engine || busy) return;
  busy = true;
  ui.toggle.disabled = true;
  setStatus('loading', 'Checking your browser…');

  modelId = await pickModel();
  if (!modelId) {
    busy = false;
    ui.toggle.disabled = false;
    setStatus('unsupported', "AI answers need WebGPU (recent Chrome, Edge or Safari on a desktop or laptop). You'll keep getting search-based answers.");
    return;
  }

  try {
    const webllm = await import(WEBLLM_URL);
    const cached = await webllm.hasModelInCache(modelId).catch(() => false);
    setStatus('loading', cached ? 'Loading the model from your browser cache…' : 'Downloading the model (about 2 GB, one time only)…');
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: p => {
        const pct = Math.round((p.progress || 0) * 100);
        ui.progress.style.width = `${pct}%`;
        ui.status.textContent = `${cached ? 'Loading' : 'Downloading'} the model… ${pct}%`;
      },
    });
    writePref(true);
    ui.progress.style.width = '0';
    setStatus('ready', 'AI answers on: a small language model is writing answers from the site\'s facts, privately in your browser. It can still make mistakes.');
    ui.toggle.textContent = 'Turn off';
  } catch (err) {
    console.error('AI answers failed to load', err);
    engine = null;
    ui.progress.style.width = '0';
    setStatus('error', "The AI model couldn't load on this device, so answers stay search-based.");
    ui.toggle.textContent = 'Try again';
  } finally {
    busy = false;
    ui.toggle.disabled = false;
  }
}

async function disable() {
  if (busy) return;
  const e = engine;
  engine = null;
  writePref(false);
  ui.toggle.textContent = 'Turn on AI answers';
  ui.progress.style.width = '0';
  setStatus('off', 'Answers come from a keyword search of the site. Turn on AI answers to have a small language model, running privately in your browser, write them (about 2 GB, one-time download).');
  if (e) await e.unload().catch(() => {});
}

function buildFacts(results) {
  let used = 0;
  const lines = [];
  for (const r of results.slice(0, MAX_FACTS)) {
    const text = r.doc.content.trim();
    if (used + text.length > MAX_FACT_CHARS && lines.length) break;
    lines.push(`[${lines.length + 1}] ${text}`);
    used += text.length;
  }
  return lines.join('\n\n');
}

/* Answer one question. `hooks` comes from ask.html so this module reuses the
   page's own message rendering: startMessage() -> bubble element,
   render(bubble, text) formats markdown-ish text, finish(results) adds the
   source tags. Returns false when the caller should fall back. */
async function answer(question, hooks) {
  if (!engine) return false;
  if (PLANS_RE.test(question)) {
    hooks.render(hooks.startMessage(), PLANS_REPLY);
    return true;
  }
  const results = RAGEngine.search(question, MAX_FACTS);
  if (!results.length) return false; // let the classic path give its "contact Abhishek" reply

  const bubble = hooks.startMessage();
  let text = '';
  try {
    const stream = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Facts:\n${buildFacts(results)}\n\nQuestion: ${question}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
      stream: true,
    });
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta?.content || '';
      hooks.render(bubble, text);
    }
  } catch (err) {
    console.error('AI answer failed', err);
    if (!text) { bubble.closest('.message')?.remove(); return false; }
  }
  text = tidy(text);
  hooks.render(bubble, text || "I don't have that information. You can email Abhishek at **atsose@umd.edu**.");
  hooks.finish(results);
  return true;
}

function init() {
  ui.bar = $('aiBar');
  ui.status = $('aiStatus');
  ui.toggle = $('aiToggle');
  ui.progress = $('aiProgress');
  if (!ui.bar) return;
  ui.toggle.addEventListener('click', () => (engine ? disable() : enable()));
  // Visitors who turned it on before get it back automatically (it loads from cache).
  if (readPref()) enable();
}

window.AIChat = { answer, get ready() { return !!engine; } };
init();
