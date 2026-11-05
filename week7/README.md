# Week 7: Marvel Hero Lab

## Run

From the repository root, run `python3 -m http.server 8000`, then open `http://127.0.0.1:8000/week7/week7.html`.

## Verified data and methods

- Source: 303 frozen course text files at `week5/data/marvel_pages/*.txt`.
- Builder: `week7/scripts/build_retrieval_data.py`.
- Output: `week7/data/processed/retrieval_lab.json`.
- Original hero image reused unchanged: `week7/assets/微信图片_20261025204951_22_1140.jpg`.

The builder uses lowercase alphabetic tokens and a documented stopword set. It creates two inspectable chunking rules: the first 180 words, and sentence-boundary passages of at most 150 words. Sparse retrieval is cosine similarity over TF-IDF. The second representation is a 48-dimensional randomized-SVD LSA projection of that same TF-IDF matrix, not a neural embedding model. Results are calculated in the browser from the derived source data.

## Learning interactions

- Trait selection forms a visible query and recalculates both rankings from the processed corpus data.
- The chunking control switches between the two computed passage rules and shows actual ranked passages.
- Query-term weights and TF-IDF contribution chips are calculated from the active query and sparse document index.
- TF-IDF, Word2Vec, and contextual embeddings are explained separately. The Word2Vec and contextual examples are conceptual only; no Word2Vec, MiniLM, or other neural model runs in this site.
- The RAG flow is explanatory only. The site retrieves evidence but does not generate an answer.

## Limitations

The character pages are Wikipedia articles, not direct character speech. The trait controls form transparent retrieval queries; they do not predict a visitor’s personality or a character’s identity. Low-rank LSA can surface related term patterns, but it is not semantic understanding or a transformer embedding.