from langchain_chroma import Chroma
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.documents import Document
from typing import List
from rag.vector_store import VectorStore


class Retriever:

    def __init__(self, k: int = 2, fetch_k: int = 10):

        self._vector_store: Chroma = VectorStore().get_vector_store()

        self._retriever: VectorStoreRetriever = self._vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": k,
                "filter": {"type": "farming_qa"},
                "fetch_k": fetch_k,
            },
        )

    def retrieve(self, query: str) -> str:

        docs: List[Document] = self._retriever.invoke(query)

        cleaned_context = []

        for i in range(len(docs)):

            content = docs[i].page_content

            if "Answer:" in content:
                content = content.split("Answer:")[-1].strip()

            cleaned_context.append(f"Context {i+1}: {content}")

        return "\n".join(cleaned_context)


if __name__ == "__main__":
    retriever = Retriever()
    result = retriever.retrieve("What is Potato Blight")
    print(result)
