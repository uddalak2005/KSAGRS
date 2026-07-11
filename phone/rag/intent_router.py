from langchain_core.messages import AIMessage
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompt_values import PromptValue
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from typing import List, cast, Optional
from dotenv import load_dotenv
from pydantic import BaseModel


class IntentRouter:

    class Intent(BaseModel):
        intent: str | List[str]
        crop_type: Optional[str | List[str]] = None
        confidence: float

    def __init__(self):

        load_dotenv()

        self._model = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
        )

        self._parser = PydanticOutputParser(pydantic_object=self.Intent)

        self._prompt_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
            You are an intent classifier for an agriculture IVR system.

Return ONLY JSON.

INTENTS:
- disease
- weather
- mandi_price
- farming
- scheme
- greeting
- general

Extract:
- intent
- crop (if mentioned)
- confidence (0 to 1)

Do NOT omit any field.
Always return all keys.
""",
                ),
                (
                    "human",
                    """
User query:
{query}
""",
                ),
            ]
        )

    def get_intent(self, query: str) -> 'IntentRouter.Intent':

        final_prompt: PromptValue = self._prompt_template.invoke(
            {
                "query": query,
            }
        )

        response: AIMessage = self._model.invoke(final_prompt)

        try:
            parsed_data: 'IntentRouter.Intent' = cast(
                self.Intent, self._parser.parse(str(response.content))
            )
        except Exception:
            return self.Intent(intent="general", crop_type=None, confidence=0.0)

        return parsed_data
