"""Build verified Week 7 sparse and low-rank semantic retrieval data."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "week5" / "data" / "marvel_pages"
NODES = ROOT / "week1_nodes.tsv"
OUTPUT = ROOT / "week7" / "data" / "processed" / "retrieval_lab.json"
TOKEN = re.compile(r"[A-Za-z]{2,}")
SENTENCE = re.compile(r"(?<=[.!?])\s+")
PARAGRAPH = re.compile(r"\n\s*\n")
STOPWORDS = set("a an and are as at be been being but by did do does for from had has have he her here hers him his i if in into is it its itself me more most my no not of on or our she so some that the their them then there these they this to was we were what when which who will with you your also american appeared appearance based became between books can character characters comics created fictional first following including known made marvel may one other published series since story such than those through time two used within would".split())
TRAITS = [
    {"id": "science", "label": "Science & invention", "query": "science technology inventor engineering machine"},
    {"id": "cosmic", "label": "Cosmic adventure", "query": "space cosmic alien universe galaxy"},
    {"id": "justice", "label": "Street-level justice", "query": "crime city detective police justice"},
    {"id": "mutation", "label": "Transformation", "query": "mutant gamma transformation powers"},
]


def words(text: str) -> list[str]:
    return [term.lower() for term in TOKEN.findall(text) if term.lower() not in STOPWORDS]


def display_names() -> dict[str, str]:
    mapping = {}
    for row in NODES.read_text(encoding="utf-8").splitlines():
        if not row or row.startswith("#") or row.startswith("node_id"):
            continue
        columns = row.split("\t")
        if len(columns) >= 2:
            mapping[columns[0]] = columns[1]
    return mapping


def sentence_chunks(text: str, limit: int = 150) -> list[str]:
    chunks, current, size = [], [], 0
    for sentence in SENTENCE.split(text):
        sentence_words = sentence.split()
        if current and size + len(sentence_words) > limit:
            chunks.append(" ".join(current))
            current, size = [], 0
        current.append(sentence)
        size += len(sentence_words)
    if current:
        chunks.append(" ".join(current))
    return chunks


def word_count(text: str) -> int:
    return len(text.split())


def tfidf(texts: list[str], vocabulary: list[str], idf: np.ndarray) -> np.ndarray:
    index = {term: position for position, term in enumerate(vocabulary)}
    matrix = np.zeros((len(texts), len(vocabulary)), dtype=float)
    for row, text in enumerate(texts):
        terms = words(text)
        counts = Counter(terms)
        for term, count in counts.items():
            if term in index:
                matrix[row, index[term]] = count / max(len(terms), 1)
    matrix *= idf
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.maximum(norms, 1e-12)


def main() -> None:
    names = display_names()
    documents = []
    for path in sorted(CORPUS.glob("*.txt")):
        if path.name == "README.txt":
            continue
        node_id = unquote(path.stem)
        raw_text = path.read_text(encoding="utf-8")
        text = " ".join(raw_text.split())
        documents.append({"id": node_id, "name": names.get(node_id, node_id.replace("_", " ")), "text": text, "raw_text": raw_text})
    document_frequency = Counter(term for document in documents for term in set(words(document["text"])))
    total_frequency = Counter(term for document in documents for term in words(document["text"]))
    vocabulary = [term for term, _ in total_frequency.most_common(1200) if document_frequency[term] >= 4]
    idf = np.log((1 + len(documents)) / (1 + np.array([document_frequency[term] for term in vocabulary]))) + 1
    document_matrix = tfidf([document["text"] for document in documents], vocabulary, idf)
    rng = np.random.default_rng(2805)
    dimensions = 48
    projection = rng.normal(size=(len(vocabulary), dimensions + 12))
    basis, _ = np.linalg.qr(document_matrix @ projection)
    reduced = basis.T @ document_matrix
    _, _, right = np.linalg.svd(reduced, full_matrices=False)
    components = right[:dimensions]
    document_lsa = document_matrix @ components.T
    document_lsa /= np.maximum(np.linalg.norm(document_lsa, axis=1, keepdims=True), 1e-12)
    passages = []
    for document_index, document in enumerate(documents):
        first_piece = " ".join(document["text"].split()[:180])
        passages.append({"document": document_index, "strategy": "first", "index": 0, "text": first_piece})
        for passage_index, piece in enumerate(sentence_chunks(document["text"])):
            passages.append({"document": document_index, "strategy": "sentence", "index": passage_index, "text": piece})
    passage_matrix = tfidf([passage["text"] for passage in passages], vocabulary, idf)
    passage_lsa = passage_matrix @ components.T
    passage_lsa /= np.maximum(np.linalg.norm(passage_lsa, axis=1, keepdims=True), 1e-12)
    lab_document = next(document for document in documents if document["id"] == "Machine_Man")
    lab_paragraphs = [" ".join(paragraph.split()) for paragraph in PARAGRAPH.split(lab_document["raw_text"]) if paragraph.strip()]
    lab_sentence_chunks = sentence_chunks(lab_document["text"])
    lab_chunk_texts = lab_sentence_chunks + lab_paragraphs
    lab_matrix = tfidf(lab_chunk_texts, vocabulary, idf)
    lab_lsa = lab_matrix @ components.T
    lab_lsa /= np.maximum(np.linalg.norm(lab_lsa, axis=1, keepdims=True), 1e-12)
    lab_article = {
        "name": lab_document["name"],
        "rawParagraphs": lab_paragraphs,
        "preparedTokens": words(lab_paragraphs[0])[:80],
        "sentenceChunks": [{"id": index + 1, "text": text, "words": word_count(text), "vector": [round(float(value), 6) for value in lab_lsa[index]]} for index, text in enumerate(lab_sentence_chunks)],
        "paragraphChunks": [{"id": index + 1, "text": text, "words": word_count(text), "vector": [round(float(value), 6) for value in lab_lsa[len(lab_sentence_chunks) + index]]} for index, text in enumerate(lab_paragraphs)],
    }
    sparse_index = [[] for _ in vocabulary]
    for document_index, vector in enumerate(document_matrix):
        for term_index in np.flatnonzero(vector):
            sparse_index[term_index].append([document_index, round(float(vector[term_index]), 6)])
    payload = {
        "meta": {"documents": len(documents), "passages": len(passages), "vocabulary": len(vocabulary), "source": "week5/data/marvel_pages/*.txt (frozen course snapshot)", "chunking": "first: first 180 words; sentence: sentence-boundary chunks up to 150 words; paragraph: original blank-line paragraph boundaries", "denseMethod": "48-dimensional randomized-SVD LSA projection of TF-IDF; an inspectable low-rank semantic approximation, not a neural embedding model."},
        "traits": TRAITS,
        "vocabulary": vocabulary,
        "idf": [round(float(value), 6) for value in idf],
        "sparseIndex": sparse_index,
        "lsaComponents": [[round(float(value), 6) for value in row] for row in components],
        "documents": [{"name": document["name"], "id": document["id"]} for document in documents],
        "documentLsa": [[round(float(value), 6) for value in row] for row in document_lsa],
        "passages": passages,
        "passageLsa": [[round(float(value), 6) for value in row] for row in passage_lsa],
        "labArticle": lab_article,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)}: {len(documents)} documents, {len(passages)} passages, {len(vocabulary)} terms")


if __name__ == "__main__":
    main()