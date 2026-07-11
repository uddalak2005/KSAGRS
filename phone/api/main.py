import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import rag
from typing import cast

app = FastAPI(
    title="KisaanVaani API",
    description="Multilingual RAG API for agricultural assistance",
    version="1.0.0",
)


app.add_middleware(
    cast(type, CORSMiddleware),
    allow_origins=["*"],  # In production, replace "*" with your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag.router)


import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
