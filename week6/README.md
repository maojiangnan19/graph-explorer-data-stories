# Week 6: The Machine Reads Marvel

An interactive data story about what statistical text representations can discover in 303 frozen Marvel-character course texts, and what they cannot establish.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/week6/week6.html`.

## Data and preprocessing

- Raw input: `week5/data/marvel_pages/*.txt`, the frozen course text snapshot (303 documents).
- Derived output: `week6/data/processed/marvel_text_analysis.json`.
- Rebuild command: `python3 week6/scripts/build_analysis.py`.
- Script: `week6/scripts/build_analysis.py`, implemented with Python standard library and NumPy only.

The script lowercases alphabetic tokens, removes a documented English stopword set, keeps terms appearing in at least four documents, and retains the 1,600 most frequent candidates (1,593 in this snapshot). It then calculates TF-IDF with smoothed IDF, cosine similarities, normalized-rate group comparison scores, deterministic four-component non-negative matrix factorization, and document-level positive PMI.

## Interactions

- Character selector: renders real per-document TF-IDF terms and five cosine-nearest text documents.
- Group selector: compares the selected name-based group with all other documents using normalized word-rate log differences.
- Topic selector: shows terms and the highest-weighted documents for each deterministic NMF component. Topics are representations, not ground-truth labels.
- Word network: clicking a word focuses its document-level PPMI edges; unrelated nodes fade. It visualizes co-occurrence association, not embedding similarity or semantic equivalence.

## Known limits

The text snapshot consists of Wikipedia articles, not speech by fictional characters. The topic components can surface boilerplate and editorial patterns. Metrics describe the selected representation only; they do not demonstrate intent, relationship meaning, or human understanding.

## Verification

`python3 week6/scripts/build_analysis.py` generated valid JSON for 303 documents and 1,593 vocabulary terms. Browser validation should be run via a local HTTP server because the page fetches the processed JSON.