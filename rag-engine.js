/**
 * rag-engine.js — Thorough client-side RAG pipeline
 *
 * Pipeline stages:
 *   1. Query Analysis   — intent detection, synonym expansion, paper routing
 *   2. BM25 Retrieval   — keyword-aware scoring with field boosts
 *   3. Re-ranking        — group related chunks, boost same-paper clusters
 *   4. Snippet Extraction — pull most relevant sentences from matched chunks
 *   5. Response Assembly  — format multi-chunk answers with context headers
 *   6. Sanitization       — strip any leaked PII
 *
 * Zero API costs — runs entirely in the browser.
 */

const RAGEngine = (function () {
  'use strict';

  // ===============================
  // 0. TEXT PROCESSING
  // ===============================
  const STOP_WORDS = new Set([
    'a','an','the','is','are','was','were','be','been','being','have','has','had',
    'do','did','will','would','shall','should','may','might','must','can','could','does',
    'i','me','my','we','our','you','your','he','him','his','she','her','it','its',
    'they','them','their','this','that','these','those','am','or','and','but','if',
    'then','so','no','not','of','at','by','for','with','to','from','in','on',
    'up','out','off','over','into','as','than','too','very','just','also',
    'which','how','when','why','all','each','every','both',
    'few','more','most','other','some','such','only','own','same',
    'dr','mr','please','like','want','need',
    'got','make','much','many','well','really'
  ]);
  // Note: intentionally NOT stopping 'abhishek', 'sose', 'work', 'paper', 'what', 'who',
  // 'about', 'tell', 'know', 'used', 'using' — these are exactly the words that show up
  // in the most common questions this bot gets ("what does Abhishek work on?", "who is
  // Abhishek Sose?", "what papers has he published?", "what force field did he use for
  // X?"). An earlier version stopped all of them, which meant those queries tokenized to
  // an empty array and silently fell back to "I don't have specific information" — this
  // is why some pretty basic questions were failing.

  // Domain-specific synonym map: query term -> expansion terms
  const SYNONYMS = {
    // Methods
    'md':          ['molecular','dynamics','simulation','lammps'],
    'dft':         ['density','functional','theory','vasp','quantum'],
    'aimd':        ['initio','molecular','dynamics','dft'],
    'gcmc':        ['grand','canonical','monte','carlo'],
    'nemd':        ['non','equilibrium','molecular','dynamics','shear'],
    'mlip':        ['machine','learned','interatomic','potential','deepmd','allegro'],
    'ml':          ['machine','learning','model','prediction','neural','network'],
    'ai':          ['artificial','intelligence','machine','learning','deep'],
    'llm':         ['large','language','model','gpt','llama','fine','tuning'],
    'buq':         ['bayesian','uncertainty','quantification','sampling','posterior'],
    'cnn':         ['convolutional','neural','network','3d','deep','learning'],
    'pso':         ['particle','swarm','optimization'],
    'ga':          ['genetic','algorithm','evolutionary'],
    'fea':         ['finite','element','analysis','method','fem'],
    'fem':         ['finite','element','method','analysis','fea'],
    'rag':         ['retrieval','augmented','generation'],

    // Materials
    'mof':         ['metal','organic','framework','porous','uio','irmof','hkust','mil'],
    'aerogel':     ['composite','montmorillonite','cnf','sio2','cmc','insulation'],
    'graphene':    ['2d','carbon','sheet','nanosheet','gr'],
    'bn':          ['boron','nitride','hexagonal','2d'],
    'mos2':        ['molybdenum','disulfide','dichalcogenide','2d'],
    'polymer':     ['polymeric','membrane','conductivity','anion','exchange'],
    'mpea':        ['multi','principal','element','alloy','high','entropy','hea'],
    'hea':         ['high','entropy','alloy','mpea','multi','principal'],
    'eam':         ['embedded','atom','model','potential','force','field'],

    // Applications
    'drug':        ['delivery','release','adsorption','pharmaceutical','cancer','anti'],
    'hydrogen':    ['h2','storage','adsorption','fuel','cell','energy'],
    'h2':          ['hydrogen','storage','adsorption','fuel'],
    'tribology':   ['friction','wear','lubricant','lubrication','surface'],
    'solvent':     ['green','sustainable','substitution','gsk','gscore'],
    'water':       ['confined','confinement','wetting','contact','angle','hydrophilic'],
    'lithium':     ['ion','conductivity','battery','electrolyte','li'],

    // General academic
    'phd':         ['doctoral','thesis','dissertation','virginia','tech'],
    'postdoc':     ['postdoctoral','researcher','umd','maryland','georgia','tech'],
    'publication': ['paper','article','journal','published'],
    'cite':        ['citation','cited','impact'],
    'award':       ['prize','honor','recognition','outstanding','best'],
    'robot':       ['robotic','automation','self','driving','laboratory','autonomous'],
    'faculty':     ['professor','academic','tenure','position','hire']
  };

  // Paper title -> chunk ID prefix mapping for direct routing
  const PAPER_ROUTES = {
    'green solvent':      'pub-green',
    'solvent substitut':  'pub-green',
    'greensolventdb':     'pub-green',
    'gsk':                'pub-green',
    'advanced science':   'pub-green',
    'drug adsorption':    'pub-drug',
    'drug delivery mof':  'pub-drug',
    'rsc advances':       'pub-drug',
    'host guest':         'pub-jacs',
    'photoactivat':       'pub-jacs',
    'uio-azb':            'pub-jacs',
    'jacs':               'pub-jacs',
    'azobenzene':         'pub-jacs',
    'on demand':          'pub-jacs',
    'hydrogen mof':       'pub-h2',
    'h2 mof':             'pub-h2',
    'h2 storage':         'pub-h2',
    'irmof':              'pub-h2',
    'hydrogen storage':   'pub-h2',
    'tribology':          'pub-trib',
    'friction':           'pub-trib',
    'wear':               'pub-trib',
    'lubricant':          'pub-trib',
    'water confin':       'pub-water',
    'hybrid layer':       'pub-water',
    'sampling algorithm': 'pub-buq24',
    'buq sampling':       'pub-buq24',
    'peuqse':             'pub-buq24',
    'coarse grain':       'pub-cgeam',
    'cg eam':             'pub-cgeam',
    'fenicrcocu':         'pub-mpea',
    'mpea':               'pub-mpea',
    'npj computational':  'pub-mpea',
    'mos2 water param':   'pub-mos2',
    'mos2 contact':       'pub-mos2',
    'mof membrane':       'pub-membrane',
    'h2 ch4 separat':     'pub-membrane',
    'fluorine free':      'pub-aem',
    'anion exchange':     'pub-aem',
    'microcontact':       'pub-stamp',
    'stamp':              'pub-stamp',
    'thermal shock':      'pub-nrm',
    'nature protocol':    'pub-np',
    'plastic substitut':  'pub-np',
    'robot workflow':     'pub-np'
  };

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\-/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  function stem(word) {
    return word
      .replace(/ies$/, 'y')
      .replace(/ves$/, 'f')
      .replace(/s$/, '')
      .replace(/ing$/, '')
      .replace(/tion$/, 't')
      .replace(/ment$/, '')
      .replace(/ness$/, '')
      .replace(/ally$/, '')
      .replace(/ment$/, '')
      .replace(/ed$/, '');
  }

  function processTokens(text) {
    return tokenize(text).map(stem);
  }

  // ===============================
  // 1. QUERY ANALYSIS
  // ===============================

  function detectIntent(query) {
    const q = query.toLowerCase().trim();
    if (/^(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening))\b/i.test(q)) return 'greeting';
    if (/^(thanks|thank\s*you|thx|ty|cheers)\b/i.test(q)) return 'thanks';
    if (/how many.*(paper|publication|article)/i.test(q)) return 'pub_count';
    if (/list.*(all|every).*(paper|publication)/i.test(q)) return 'pub_list';
    if (/\b(phone|number|call|cell|mobile|address|street|zip)\b/i.test(q)) return 'private';
    if (/(contact|email|reach)\b/i.test(q)) return 'contact';
    if (/\b(where|live|location|based|city)\b/i.test(q)) return 'location';
    if (/(education|degree|phd|school|universit)/i.test(q)) return 'education';
    if (/(award|honor|prize|recognition)/i.test(q)) return 'awards';
    if (/\b(skill|software|tool|program|language)\b/i.test(q)) return 'skills';
    if (/(faculty|professor|hire|job|future|plan|group)\b/i.test(q)) return 'career';
    return 'general';
  }

  /**
   * Expand query with synonyms for better recall.
   * Returns { original: [...tokens], expanded: [...tokens] }
   */
  function expandQuery(query) {
    const rawTokens = tokenize(query);
    const original = rawTokens.map(stem);
    const expansions = [];

    rawTokens.forEach(token => {
      const key = token.toLowerCase();
      if (SYNONYMS[key]) {
        SYNONYMS[key].forEach(syn => {
          const s = stem(syn);
          if (!original.includes(s) && !expansions.includes(s)) expansions.push(s);
        });
      }
    });

    // Also check multi-word phrases in the query
    const lowerQ = query.toLowerCase();
    Object.keys(SYNONYMS).forEach(key => {
      if (key.length > 3 && lowerQ.includes(key) && !rawTokens.includes(key)) {
        SYNONYMS[key].forEach(syn => {
          const s = stem(syn);
          if (!original.includes(s) && !expansions.includes(s)) expansions.push(s);
        });
      }
    });

    return { original, expanded: [...original, ...expansions] };
  }

  /**
   * Detect if query targets a specific paper -> return chunk ID prefix
   */
  function detectPaperRoute(query) {
    const q = query.toLowerCase();
    for (const [pattern, prefix] of Object.entries(PAPER_ROUTES)) {
      if (q.includes(pattern)) return prefix;
    }
    return null;
  }

  // ===============================
  // 2. BM25 RETRIEVAL
  // ===============================
  const BM25_K1 = 1.5;
  const BM25_B  = 0.75;

  let corpus = [];
  let avgDocLen = 0;
  let docFreqs = {};
  // Sentence index for snippet extraction
  let sentenceIndex = {};

  function buildIndex() {
    corpus = KNOWLEDGE_BASE.map(chunk => {
      const allText = [
        chunk.content,
        chunk.keywords.join(' '),
        chunk.category,
        chunk.id
      ].join(' ');
      const tokens = processTokens(allText);
      const contentTokens = processTokens(chunk.content);

      // Build sentence index: split on period-space or semicolon-space
      sentenceIndex[chunk.id] = chunk.content
        .split(/(?<=[.;])\s+/)
        .filter(s => s.length > 10);

      return {
        ...chunk,
        tokens,
        contentTokens,
        tokenSet: new Set(tokens)
      };
    });

    const totalLen = corpus.reduce((s, d) => s + d.tokens.length, 0);
    avgDocLen = totalLen / corpus.length;

    docFreqs = {};
    corpus.forEach(doc => {
      doc.tokenSet.forEach(term => {
        docFreqs[term] = (docFreqs[term] || 0) + 1;
      });
    });
  }

  function bm25Score(queryTokens, doc) {
    const N = corpus.length;
    const dl = doc.tokens.length;
    let score = 0;

    const tf = {};
    doc.tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

    queryTokens.forEach(qt => {
      const df = docFreqs[qt] || 0;
      if (df === 0) return;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const termFreq = tf[qt] || 0;
      const tfNorm = (termFreq * (BM25_K1 + 1)) /
        (termFreq + BM25_K1 * (1 - BM25_B + BM25_B * dl / avgDocLen));
      score += idf * tfNorm;
    });

    return score;
  }

  /**
   * Score a document with field-weighted BM25 + keyword bonus + priority
   */
  function scoreDoc(queryTokens, originalTokens, doc) {
    let score = bm25Score(queryTokens, doc);

    // Keyword field boost: original query terms matching keywords -> big bonus
    const keywordStems = doc.keywords.map(stem);
    originalTokens.forEach(qt => {
      if (keywordStems.includes(qt)) score += 3.0;
    });

    // Content field boost: original terms in content -> moderate bonus
    originalTokens.forEach(qt => {
      if (doc.contentTokens.includes(qt)) score += 0.5;
    });

    // Priority bonus (scaled down)
    score += (doc.metadata.priority || 0) * 0.08;

    return score;
  }

  function retrieve(query, topK = 10) {
    let { original, expanded } = expandQuery(query);

    // Defensive fallback: if a query happens to tokenize to nothing (e.g. entirely
    // punctuation, or every word happened to be a stopword), retry with a minimal
    // stopword set rather than silently returning no results. Better to over-match
    // than to falsely claim "I don't know" on a question that had real content.
    if (original.length === 0) {
      const MINIMAL_STOPS = new Set(['a','an','the','is','of','to','in','on','and','or']);
      const raw = query.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/-/g, ' ')
        .split(/\s+/).filter(w => w.length > 1 && !MINIMAL_STOPS.has(w));
      original = raw.map(stem);
      expanded = original;
      if (original.length === 0) return [];
    }

    const paperRoute = detectPaperRoute(query);

    let scored = corpus.map(doc => {
      let score = scoreDoc(expanded, original, doc);

      // Paper routing boost: if query targets a specific paper, boost its chunks hard
      if (paperRoute && doc.id.startsWith(paperRoute)) {
        score += 5.0;
      }

      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter(s => s.score > 0.5)
      .slice(0, topK);
  }

  // ===============================
  // 3. RE-RANKING: pull in sibling chunks
  // ===============================

  /**
   * Get the "paper family" from a chunk ID, e.g. "pub-green-methods" -> "pub-green"
   */
  function getChunkFamily(id) {
    const parts = id.split('-');
    if (parts.length >= 2 && parts[0] === 'pub') {
      return parts.slice(0, 2).join('-');
    }
    return id;
  }

  /**
   * Given retrieved results, pull in sibling chunks from the same paper
   * if any paper chunk scored highly — ensures complete paper answers.
   */
  function expandWithSiblings(results, query) {
    const familyScores = {};
    results.forEach(r => {
      const fam = getChunkFamily(r.doc.id);
      if (!familyScores[fam] || r.score > familyScores[fam]) {
        familyScores[fam] = r.score;
      }
    });

    const includedIds = new Set(results.map(r => r.doc.id));
    const extras = [];

    // For high-scoring paper families, pull in ALL sibling chunks
    Object.entries(familyScores)
      .filter(([fam, score]) => score > 4.0 && fam.startsWith('pub-'))
      .forEach(([fam]) => {
        corpus
          .filter(doc => getChunkFamily(doc.id) === fam && !includedIds.has(doc.id))
          .forEach(doc => {
            extras.push({ doc, score: familyScores[fam] * 0.6 });
          });
      });

    return [...results, ...extras];
  }

  // ===============================
  // 4. SNIPPET EXTRACTION
  // ===============================

  /**
   * Score each sentence by relevance to query tokens.
   * Returns the best sentences (up to maxSentences) in original order.
   */
  function extractSnippets(chunkId, queryTokens, maxSentences) {
    maxSentences = maxSentences || 5;
    const sentences = sentenceIndex[chunkId] || [];
    if (sentences.length <= maxSentences) return sentences;

    const scored = sentences.map((s, idx) => {
      const sTokens = processTokens(s);
      let hits = 0;
      queryTokens.forEach(qt => {
        if (sTokens.includes(qt)) hits++;
      });
      // Bias toward first sentence (topic sentence)
      return { text: s, score: hits + (idx === 0 ? 0.5 : 0), idx };
    });

    scored.sort((a, b) => b.score - a.score);

    // Take top sentences, return in original order for coherence
    const selected = scored
      .slice(0, maxSentences)
      .sort((a, b) => a.idx - b.idx);

    return selected.map(s => s.text);
  }

  // ===============================
  // 5. RESPONSE ASSEMBLY
  // ===============================

  function chunkLabel(id) {
    const labels = {
      'overview':     '📄 Overview',
      'methods':      '🔬 Methods',
      'results':      '📊 Key Results',
      'specifics':    '🔍 Details',
      'design':       '🎯 Design Rules',
      'ml':           '🤖 ML Models',
      'casestudies':  '📋 Case Studies',
      'analysis':     '📐 Analysis',
      'materials':    '🧪 Materials',
      'simulations':  '💻 Simulations',
      'details':      '🔍 Details',
      'rules':        '🎯 Design Rules'
    };
    const suffix = id.split('-').pop();
    return labels[suffix] || '';
  }

  // Define section ordering for structured paper responses
  const SECTION_ORDER = ['overview','methods','results','design','rules','ml','casestudies','specifics','analysis','materials','simulations','details'];

  function sectionSortKey(id) {
    const suffix = id.split('-').pop();
    const idx = SECTION_ORDER.indexOf(suffix);
    return idx === -1 ? 99 : idx;
  }

  function assembleResponse(results, query) {
    const { original } = expandQuery(query);
    const paperRoute = detectPaperRoute(query);

    // ---- PAPER-SPECIFIC QUERY ----
    if (paperRoute) {
      const paperChunks = results
        .filter(r => getChunkFamily(r.doc.id) === paperRoute || r.doc.id === paperRoute)
        .sort((a, b) => sectionSortKey(a.doc.id) - sectionSortKey(b.doc.id));

      if (paperChunks.length > 0) {
        let response = '';

        paperChunks.forEach((r, i) => {
          const label = chunkLabel(r.doc.id);
          const snippets = extractSnippets(r.doc.id, original, 8);
          if (label && paperChunks.length > 1) {
            response += (i > 0 ? '\n\n' : '') + label + '\n';
          } else if (i > 0) {
            response += '\n\n';
          }
          response += snippets.join(' ');
        });

        // Append any high-scoring cross-cutting context
        const extras = results
          .filter(r => getChunkFamily(r.doc.id) !== paperRoute && r.score > 3.0)
          .slice(0, 1);
        extras.forEach(r => {
          response += '\n\n**Related context:** ' + extractSnippets(r.doc.id, original, 2).join(' ');
        });

        return response;
      }
    }

    // ---- NO RESULTS ----
    if (results.length === 0) {
      return "I don't have specific information about that in my knowledge base. For detailed questions, I'd recommend reaching out to Abhishek directly at **atsose@umd.edu** or checking his [Google Scholar](https://scholar.google.ca/citations?user=PnaArzMAAAAJ&hl=en) profile.";
    }

    // ---- GENERAL QUERY: assemble from top results ----
    let response = '';
    const usedFamilies = new Set();
    let blockCount = 0;
    const MAX_BLOCKS = 5;

    // Sort by score descending
    const sorted = [...results].sort((a, b) => b.score - a.score);

    sorted.forEach(r => {
      if (blockCount >= MAX_BLOCKS) return;
      const fam = getChunkFamily(r.doc.id);

      // For paper families, show only the most relevant chunk (avoid dumping entire papers)
      if (fam.startsWith('pub-') && usedFamilies.has(fam)) return;

      const snippets = extractSnippets(r.doc.id, original, 5);
      if (response.length > 0) response += '\n\n';
      response += snippets.join(' ');
      usedFamilies.add(fam);
      blockCount++;
    });

    return response;
  }

  // ===============================
  // 6. SANITIZATION
  // ===============================
  function sanitize(text) {
    // Require: digits, a capitalized street-name word, a WHOLE-WORD street
    // abbreviation, and a trailing 5-digit ZIP somewhere in the same clause.
    // The previous version had no word boundary before the abbreviation, so
    // it matched "St" inside ordinary words like "first" (e.g. "8 first-author"
    // silently became "[redacted]-author") and mangled unrelated numbers
    // anywhere near a word containing st/rd/dr/ln/ct/pl/way as a substring.
    text = text.replace(/\b\d{1,5}\s+[A-Z][\w\s]{0,40}?\b(Ave|Avenue|St|Street|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\.?\b[^.]{0,40}?\b\d{5}(-\d{4})?\b/g, '[redacted]');
    text = text.replace(/\bApt\.?\s*#?\d+[A-Za-z]?\b/gi, '');
    text = text.replace(/\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '');
    text = text.replace(/,\s*,/g, ',').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ');
    return text.trim();
  }

  // ===============================
  // MAIN: generateResponse
  // ===============================
  function generateResponse(query) {
    const intent = detectIntent(query);

    if (intent === 'greeting') {
      return "Hi there! 👋 I'm an AI assistant with detailed knowledge of Abhishek's research, publications, methods, and results. Ask me anything — I can answer specific questions about individual papers too!";
    }
    if (intent === 'thanks') {
      return "You're welcome! Feel free to ask anything else about Abhishek's research or background. For direct communication, you can reach him at **atsose@umd.edu**.";
    }
    if (intent === 'private') {
      return "For privacy reasons, phone numbers and physical addresses aren't shared here. The best way to reach Abhishek is via email at **atsose@umd.edu** or through his [LinkedIn](https://linkedin.com/in/abhisheksose).";
    }

    // Stage 1: Retrieve
    const results = retrieve(query, 10);

    // Stage 2: Expand with sibling chunks for paper-specific queries
    const expanded = expandWithSiblings(results, query);

    // Stage 3: Assemble
    let response;

    if (intent === 'pub_list') {
      const seen = new Set();
      response = "Here are Abhishek's publications:\n\n";
      let count = 0;
      corpus
        .filter(d => d.category === 'publications')
        .sort((a, b) => (b.metadata.year || 0) - (a.metadata.year || 0))
        .forEach(p => {
          const fam = getChunkFamily(p.id);
          if (seen.has(fam)) return;
          seen.add(fam);
          count++;
          const firstSent = (sentenceIndex[p.id] || [p.content])[0];
          response += `**${count}.** ${firstSent}\n\n`;
        });

    } else if (intent === 'pub_count') {
      response = "Abhishek has published **17 peer-reviewed articles** (including 2 under review/submitted in 2026), with **8 as first author** and **4 co-first author** publications. His current total citations are **331**.\n\n";
      response += assembleResponse(expanded, query);

    } else {
      response = assembleResponse(expanded, query);
    }

    // Stage 4: Sanitize
    return sanitize(response);
  }

  // ===============================
  // PUBLIC API
  // ===============================
  function init() {
    buildIndex();
  }

  return {
    init,
    search: retrieve,
    generateResponse,
  };
})();
