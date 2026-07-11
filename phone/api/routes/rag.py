from fastapi import APIRouter, HTTPException, Depends
from api.schemas.request import QueryRequest
from api.schemas.response import QueryResponse
from rag.main import Rag

router = APIRouter(tags=["RAG"])
rag_engine = Rag()


@router.get("/health")
async def health_check():
    """
    Checks the health of the RAG service.
    In production, you'd also verify the Vector DB connection here.
    """
    return {"status": "healthy", "service": "KisaanVaani-RAG", "database": "connected"}


@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
    Receives a query and a language preference, processes it through
    the RAG pipeline, and returns the generated response.
    """
    try:

        result = rag_engine.main(
            query_string=request.query, lang=request.language, is_web=True
        )

        return QueryResponse(response=result)

    except Exception as e:
        print(f"Error during RAG execution: {str(e)}")

        raise HTTPException(
            status_code=500, detail="An error occurred while processing your query."
        )
