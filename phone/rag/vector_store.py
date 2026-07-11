from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv


class VectorStore:

    _instance: 'VectorStore' = None
    _vector_store: Chroma
    _embedder: HuggingFaceEmbeddings

    def __new__(cls):

        load_dotenv()

        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)

            cls._instance._embedder = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )

            cls._instance._vector_store = Chroma(
                collection_name="farming_qa",
                embedding_function=cls._instance._embedder,
                persist_directory="./chroma_langchain_db",
            )

        return cls._instance

    def get_vector_store(self):
        return self._vector_store

    def get_embedder(self):
        return self._embedder
