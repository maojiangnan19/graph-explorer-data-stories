const STOPWORDS = new Set('a an and are as at be been being but by did do does for from had has have he her here hers him his i if in into is it its itself me more most my no not of on or our she so some that the their them then there these they this to was we were what when which who will with you your'.split(' '));
const CHARACTERS = {
  'Spider-Man': { page: 'Spider-Man', networkName: 'Spider-Man' },
  Venom: { page: 'Venom_(character)', networkName: 'Venom (character)' }
};

const state = { selected: 'Spider-Man', documents: new Map(), tokenized: false, contextTerm: 'enemy', network: new Map(), networkReady: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function parseTsv(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => line.split('\t'));
}

function updateNetworkEvidence(title) {
  const output = $('#network-evidence');
  if (!state.networkReady) return;
  const node = state.network.get(CHARACTERS[title]?.networkName || title);
  output.textContent = node
    ? `Week 1 Marvel snapshot: 303 superhero nodes · ${node.incoming} incoming links · ${node.outgoing} outgoing links.`
    : `${title} is outside the 303-node Week 1 superhero snapshot. The text analysis remains a live Wikipedia document comparison.`;
}

async function loadNetworkSnapshot() {
  try {
    const [nodesResponse, edgesResponse] = await Promise.all([fetch('data/week1_nodes.tsv'), fetch('data/week1_edges.tsv')]);
    if (!nodesResponse.ok || !edgesResponse.ok) throw new Error('The local TSV files could not be loaded.');
    const nodes = parseTsv(await nodesResponse.text());
    const edges = parseTsv(await edgesResponse.text());
    nodes.slice(1).forEach((row) => { if (row[0]) state.network.set(row[1], { id: row[0], incoming: 0, outgoing: 0 }); });
    edges.slice(1).forEach(([source, target]) => {
      const sourceNode = [...state.network.values()].find((node) => node.id === source);
      const targetNode = [...state.network.values()].find((node) => node.id === target);
      if (sourceNode) sourceNode.outgoing += 1;
      if (targetNode) targetNode.incoming += 1;
    });
    state.networkReady = true;
    updateNetworkEvidence(state.selected);
  } catch (error) {
    $('#network-evidence').textContent = `Week 1 network data unavailable: ${error.message}`;
  }
}

function tokenize(text) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[^\s]/g) || [];
}

function normalize(token, options = {}) {
  let value = token;
  if (options.lowercase) value = value.toLowerCase();
  if (options.punctuation && /^[^A-Za-z0-9]+$/.test(value)) return '';
  if (options.lemma) value = value.replace(/(ing|ed|es|s)$/i, (ending) => ending.length > 1 ? '' : ending);
  if (options.stopwords && STOPWORDS.has(value.toLowerCase())) return '';
  return value;
}

function processTokens(text, options = {}) {
  return tokenize(text).map((token) => normalize(token, options)).filter(Boolean);
}

function wordTokens(text, options = {}) {
  return processTokens(text, options).filter((token) => /[A-Za-z]/.test(token));
}

function frequencies(tokens) {
  return tokens.reduce((counts, token) => {
    const key = token.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function firstSentence(text) {
  return text.split(/(?<=[.!?])\s+/)[0] || text;
}

async function fetchWikipediaExtract(title) {
  if (state.documents.has(title)) return state.documents.get(title);
  const endpoint = new URL('https://en.wikipedia.org/w/api.php');
  endpoint.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', redirects: '1', prop: 'extracts|info', inprop: 'url', exintro: '0', explaintext: '1', titles: title }).toString();
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}.`);
  const data = await response.json();
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing || !page.extract) throw new Error('No readable extract was returned for this page.');
  const document = { title: page.title, text: page.extract.replace(/\s+/g, ' ').trim(), url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}` };
  state.documents.set(title, document);
  return document;
}

function updateDocument(document) {
  const tokens = wordTokens(document.text);
  $('#node-name').textContent = state.selected;
  $('#document-title').textContent = state.selected;
  $('#document-preview').textContent = firstSentence(document.text);
  $('#source-link').href = document.url;
  $('#char-count').textContent = document.text.length.toLocaleString();
  $('#word-count').textContent = tokens.length.toLocaleString();
  $('#raw-sentence').textContent = firstSentence(document.text);
  $('#source-status').textContent = `Live English Wikipedia extract loaded for ${state.selected}. Counts below are calculated in this browser.`;
  updateNetworkEvidence(state.selected);
  updateCorpus(document);
  updateTokens();
  updateNgrams();
}

function updateCorpus(document) {
  const tokens = wordTokens(document.text);
  const counts = frequencies(tokens);
  const content = wordTokens(document.text, { lowercase: true, stopwords: true });
  const contentCounts = frequencies(content);
  $('#corpus-token-count').textContent = tokens.length.toLocaleString();
  $('#corpus-type-count').textContent = counts.size.toLocaleString();
  $('#hapax-count').textContent = [...counts.values()].filter((count) => count === 1).length.toLocaleString();
  $('#frequency-list').innerHTML = [...contentCounts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 10).map(([word, count]) => `<li><span>${escapeHtml(word)}</span><b>${count}</b></li>`).join('') || '<li>There are no content words to count.</li>';
}

function updateTokens() {
  const options = { lowercase: $('#lowercase-toggle').checked, punctuation: $('#punctuation-toggle').checked, stopwords: $('#stopwords-toggle').checked, lemma: $('#lemma-toggle').checked };
  const tokens = processTokens($('#raw-sentence').textContent, options);
  const types = new Set(tokens.map((token) => token.toLowerCase()));
  $('#token-count').textContent = tokens.length;
  $('#type-count').textContent = types.size;
  $('#vocab-count').textContent = types.size;
  if (!state.tokenized) return;
  $('#token-output').innerHTML = tokens.map((token) => `<span>${escapeHtml(token)}</span>`).join('') || '<span>No tokens remain after these choices.</span>';
}

function kwic(text, term) {
  const words = text.split(/\s+/);
  const result = [];
  const expression = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[.,;:!?)]*)$`, 'i');
  words.forEach((word, index) => {
    if (!expression.test(word)) return;
    result.push({ before: words.slice(Math.max(0, index - 11), index).join(' '), match: word.replace(/[.,;:!?)]*$/, ''), after: words.slice(index + 1, index + 12).join(' ') });
  });
  return result.slice(0, 6);
}

async function updateContext() {
  const output = $('#kwic-output');
  output.innerHTML = '<p class="kwic-empty">Loading context from the live extracts...</p>';
  try {
    const venom = await fetchWikipediaExtract(CHARACTERS.Venom.page);
    const matches = kwic(venom.text, state.contextTerm);
    if (!matches.length) {
      output.innerHTML = `<p class="kwic-empty">“${escapeHtml(state.contextTerm)}” does not appear in these loaded extracts. Try another term or inspect the source pages directly.</p>`;
      return;
    }
    output.innerHTML = matches.map((item) => `<div class="kwic-row"><span class="before">${escapeHtml(item.before)}</span><mark>${escapeHtml(item.match)}</mark><span>${escapeHtml(item.after)}</span></div>`).join('');
  } catch (error) {
    output.innerHTML = `<p class="kwic-empty">Context could not be loaded: ${escapeHtml(error.message)}</p>`;
  }
}

function updateNgrams() {
  const document = state.documents.get(CHARACTERS[state.selected].page);
  const size = Number($('#ngram-range').value);
  $('#ngram-value').textContent = size;
  if (!document) return;
  const words = wordTokens(document.text, { lowercase: true, stopwords: true });
  const ngrams = new Map();
  for (let index = 0; index <= words.length - size; index += 1) {
    const gram = words.slice(index, index + size).join(' ');
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }
  const entries = [...ngrams.entries()].sort((first, second) => second[1] - first[1]).slice(0, 8);
  $('#ngram-output').innerHTML = entries.length ? entries.map(([gram, count]) => `<span>${escapeHtml(gram)} <b>${count}</b></span>`).join('') : '<span>Not enough tokens for this n-gram size.</span>';
}

function updateMatrix() {
  const text = $('#editable-document').value;
  const words = wordTokens(text, { lowercase: true, stopwords: true });
  const vocabulary = [...new Set(words)];
  const counts = frequencies(words);
  const header = vocabulary.map((word) => `<th>${escapeHtml(word)}</th>`).join('');
  const values = vocabulary.map((word) => `<td>${counts.get(word)}</td>`).join('');
  $('#matrix-output').innerHTML = vocabulary.length ? `<table class="matrix-table"><thead><tr><th>document</th>${header}</tr></thead><tbody><tr><td>your text</td>${values}</tr></tbody></table>` : '<p>No content words remain to form a vector.</p>';
}

function cosineSimilarity(firstText, secondText) {
  const first = frequencies(wordTokens(firstText, { lowercase: true, stopwords: true }));
  const second = frequencies(wordTokens(secondText, { lowercase: true, stopwords: true }));
  const terms = new Set([...first.keys(), ...second.keys()]);
  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  terms.forEach((term) => {
    const firstValue = first.get(term) || 0;
    const secondValue = second.get(term) || 0;
    dot += firstValue * secondValue;
    firstMagnitude += firstValue ** 2;
    secondMagnitude += secondValue ** 2;
  });
  const score = firstMagnitude && secondMagnitude ? dot / Math.sqrt(firstMagnitude * secondMagnitude) : 0;
  const shared = [...first.keys()].filter((term) => second.has(term)).sort((firstTerm, secondTerm) => ((second.get(secondTerm) || 0) + (first.get(secondTerm) || 0)) - ((second.get(firstTerm) || 0) + (first.get(firstTerm) || 0))).slice(0, 8);
  return { score, shared };
}

async function updateSimilarity() {
  try {
    const [spider, venom] = await Promise.all([fetchWikipediaExtract(CHARACTERS['Spider-Man'].page), fetchWikipediaExtract(CHARACTERS.Venom.page)]);
    const result = cosineSimilarity(spider.text, venom.text);
    $('#similarity-score').textContent = result.score.toFixed(3);
    $('#similarity-method').textContent = 'Cosine similarity · stopwords removed';
    $('#shared-words').textContent = result.shared.length ? `Shared frequent terms: ${result.shared.join(' · ')}` : 'No shared content terms in the loaded extracts.';
    $('#relationship-words').textContent = result.shared.length ? `Shared terms in these documents include ${result.shared.slice(0, 5).join(', ')}.` : 'The documents do not share enough content terms for a useful glance.';
  } catch (error) {
    $('#similarity-method').textContent = `Similarity unavailable: ${error.message}`;
    $('#shared-words').textContent = 'Connect to Wikipedia, then reload to calculate from real document vectors.';
  }
}

async function selectCharacter(name) {
  state.selected = name;
  $$('.character-button').forEach((button) => button.classList.toggle('is-active', button.dataset.character === name));
  $('#source-status').textContent = `Loading the English Wikipedia extract for ${name}...`;
  try {
    updateDocument(await fetchWikipediaExtract(CHARACTERS[name].page));
  } catch (error) {
    $('#document-preview').textContent = `The live source could not be loaded: ${error.message}`;
    $('#source-status').textContent = 'No analysis is shown until a real source extract is available.';
  }
}

function wireInteractions() {
  const menu = $('.menu-toggle');
  const nav = $('.site-nav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); });
  $$('.site-nav a').forEach((link) => link.addEventListener('click', () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); }));
  $$('.character-button').forEach((button) => button.addEventListener('click', () => selectCharacter(button.dataset.character)));
  $('#tokenize-button').addEventListener('click', () => { state.tokenized = true; updateTokens(); });
  ['#lowercase-toggle', '#punctuation-toggle', '#stopwords-toggle', '#lemma-toggle'].forEach((selector) => $(selector).addEventListener('change', updateTokens));
  $$('.context-term').forEach((button) => button.addEventListener('click', () => { state.contextTerm = button.dataset.term; $$('.context-term').forEach((item) => item.classList.toggle('is-active', item === button)); updateContext(); }));
  $('#ngram-range').addEventListener('input', updateNgrams);
  $('#editable-document').addEventListener('input', updateMatrix);
  $$('input[name="verdict"]').forEach((input) => input.addEventListener('change', () => { $('#verdict-response').textContent = input.value === 'both' ? 'That is the most careful interpretation. Spider-Man and Venom have appeared as adversaries and temporary allies; word overlap alone cannot resolve those changing contexts.' : 'That label is too definite for a count vector. Inspect context before turning textual overlap into a social claim.'; }));
  $('#inspect-button').addEventListener('click', () => { $('#context').scrollIntoView({ behavior: 'smooth' }); updateContext(); });
}

wireInteractions();
updateMatrix();
loadNetworkSnapshot();
selectCharacter('Spider-Man');
updateContext();
updateSimilarity();