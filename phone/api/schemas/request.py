from utils.language_enum import Language
from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    language: Language = Language.HI
