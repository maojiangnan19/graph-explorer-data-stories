"""Build compact, reproducible Week 6 analysis data from the Week 5 course corpus."""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path
from urllib.parse import unquote

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "week5" / "data" / "marvel_pages"
OUTPUT = ROOT / "week6" / "data" / "processed" / "marvel_text_analysis.json"
TOKEN = re.compile(r"[A-Za-z]{2,}")
STOPWORDS = set(
    "a an and are as at be been being but by did do does for from had has have he her here hers him his i if in into is it its itself me more most my no not of on or our she so some that the their them then there these they this to was we were what when which who will with you your also american appeared appearance based became between books can character characters comics created fictional first following has had including known made marvel may more most one other published series since story such than their them they this those through time two used was were when where which who with within would".split()
)


def tokens(text: str) -> list[str]:
    return [word.lower() for word in TOKEN.findall(text) if word.lower() not in STOPWORDS]


def normalise_rows(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.maximum(norms, 1e-12)


def load_documents() -> tuple[list[str], list[str], list[list[str]]]:
    entries = []
    for path in sorted(CORPUS.glob("*.txt")):
        if path.name == "README.txt":
            continue
        node_id = unquote(path.stem)
        entries.append((node_id.replace("_", " "), node_id, tokens(path.read_text(encoding="utf-8"))))
    names, node_ids, documents = zip(*entries)
    return list(names), list(node_ids), list(documents)


def build_tfidf(documents: list[list[str]]) -> tuple[list[str], np.ndarray]:
    document_frequency = Counter()
    corpus_frequency = Counter()
    for document in documents:
        document_frequency.update(set(document))
        corpus_frequency.update(document)
    vocabulary = [term for term, _ in corpus_frequency.most_common(1600) if document_frequency[term] >= 4]
    index = {term: position for position, term in enumerate(vocabulary)}
    matrix = np.zeros((len(documents), len(vocabulary)), dtype=float)
    for row, document in enumerate(documents):
        counts = Counter(document)
        for term, count in counts.items():
            if term in index:
                matrix[row, index[term]] = count / len(document)
    idf = np.log((1 + len(documents)) / (1 + np.array([document_frequency[term] for term in vocabulary]))) + 1
    return vocabulary, matrix * idf


def build_topics(matrix: np.ndarray, vocabulary: list[str], names: list[str]) -> list[dict[str, object]]:
    rng = np.random.default_rng(602805)
    rank = 4
    values = np.maximum(matrix, 0)
    document_weights = rng.random((values.shape[0], rank)) + 0.1
    topic_weights = rng.random((rank, values.shape[1])) + 0.1
    for _ in range(150):
        topic_weights *= (document_weights.T @ values) / np.maximum(document_weights.T @ document_weights @ topic_weights, 1e-12)
        document_weights *= (values @ topic_weights.T) / np.maximum(document_weights @ (topic_weights @ topic_weights.T), 1e-12)
    topics = []
    for topic_index in range(rank):
        term_indices = np.argsort(topic_weights[topic_index])[-8:][::-1]
        document_indices = np.argsort(document_weights[:, topic_index])[-3:][::-1]
        topics.append({
            "id": f"topic-{topic_index + 1}",
            "terms": [vocabulary[index] for index in term_indices],
            "documents": [names[index] for index in document_indices],
        })
    return topics


def group_terms(documents: list[list[str]], names: list[str], keyword: str) -> dict[str, object]:
    member_indices = [index for index, name in enumerate(names) if keyword.lower() in name.lower()]
    member = Counter(term for index in member_indices for term in documents[index])
    rest = Counter(term for index, document in enumerate(documents) if index not in member_indices for term in document)
    member_total = sum(member.values())
    rest_total = sum(rest.values())
    terms = []
    for term, count in member.items():
        if count < 3:
            continue
        score = math.log((count + 0.5) / member_total) - math.log((rest[term] + 0.5) / rest_total)
        terms.append((term, score, count))
    terms.sort(key=lambda item: item[1], reverse=True)
    return {"id": keyword.lower(), "label": f"Names containing ‘{keyword}’", "count": len(member_indices), "terms": [{"term": term, "score": round(score, 3), "count": count} for term, score, count in terms[:10]]}


def build_network(documents: list[list[str]], vocabulary: list[str], topics: list[dict[str, object]]) -> dict[str, object]:
    document_frequency = Counter(term for document in documents for term in set(document))
    candidates = {term for term in vocabulary if 8 <= document_frequency[term] <= 140}
    joint_frequency = Counter()
    for document in documents:
        present = sorted(set(document) & candidates)
        for source, target in combinations(present, 2):
            joint_frequency[(source, target)] += 1
    scored_edges = []
    total = len(documents)
    for (source, target), joint in joint_frequency.items():
        if joint < 5:
            continue
        pmi = math.log2((joint * total) / (document_frequency[source] * document_frequency[target]))
        if pmi > 0:
            scored_edges.append({"source": source, "target": target, "weight": round(pmi, 3), "jointDocuments": joint})
    scored_edges.sort(key=lambda edge: (edge["weight"], edge["jointDocuments"]), reverse=True)
    selected_edges = []
    selected_terms = set()
    for edge in scored_edges:
        next_terms = selected_terms | {edge["source"], edge["target"]}
        if len(next_terms) <= 14:
            selected_edges.append(edge)
            selected_terms = next_terms
        if len(selected_edges) == 22:
            break
    return {"metric": "Positive pointwise mutual information (PPMI), based on whether terms appear in the same character document.", "nodes": [{"id": term, "documentCount": document_frequency[term]} for term in sorted(selected_terms)], "edges": selected_edges}


def main() -> None:
    names, node_ids, documents = load_documents()
    vocabulary, matrix = build_tfidf(documents)
    unit_matrix = normalise_rows(matrix)
    similarities = unit_matrix @ unit_matrix.T
    document_results = []
    for index, name in enumerate(names):
        top_terms = np.argsort(matrix[index])[-8:][::-1]
        closest = [candidate for candidate in np.argsort(similarities[index])[::-1] if candidate != index][:5]
        document_results.append({
            "name": name,
            "nodeId": node_ids[index],
            "terms": [{"term": vocabulary[position], "score": round(float(matrix[index, position]), 4)} for position in top_terms],
            "closest": [{"name": names[candidate], "score": round(float(similarities[index, candidate]), 3)} for candidate in closest],
        })
    topics = build_topics(matrix, vocabulary, names)
    data = {
        "meta": {
            "documentCount": len(names),
            "vocabularySize": len(vocabulary),
            "source": "week5/data/marvel_pages/*.txt (frozen course snapshot)",
            "transform": "Lowercase alphabetic tokens; custom English stopword removal; TF-IDF with smoothed IDF; cosine similarity; deterministic four-topic NMF; document-level PPMI.",
        },
        "documents": document_results,
        "groups": [group_terms(documents, names, keyword) for keyword in ("Spider", "Hulk", "Ghost Rider")],
        "topics": topics,
        "network": build_network(documents, vocabulary, topics),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} for {len(names)} documents and {len(vocabulary)} terms")


if __name__ == "__main__":
    main()