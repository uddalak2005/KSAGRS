from enum import Enum
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from rag.prompt_factory import PromptFactory
from rag.retriever import Retriever
from typing import List
from dotenv import load_dotenv
from rag.intent_router import IntentRouter
from utils.language_enum import Language


class Rag:

    def __init__(self) -> None:

        load_dotenv()

        self._model = ChatGroq(
            model="llama-3.3-70b-versatile",
        )

        self._history: List[AIMessage | HumanMessage | SystemMessage] = []

        self._retriever = Retriever(k=4)

        self._intent_router = IntentRouter()

    def rag_query(self, query_string: str, lang: Language, is_web: bool = False) -> str:

        rag_context: str = self._retriever.retrieve(query_string)

        system_prompt: str = PromptFactory().get_rag_prompt(lang, rag_context, is_web)

        messages = [
            SystemMessage(content=system_prompt),
            ## Because * “unpacks” the list elements into another list.
            ## Without *, you insert the whole list as ONE element.
            *self._history,
            HumanMessage(content=query_string),
        ]

        response: AIMessage = self._model.invoke(messages)

        self._history.append(HumanMessage(content=query_string))

        self._history.append(AIMessage(content=response.content))

        return str(response.content)

    def general_query(self, query_string: str, lang: Language) -> str:

        system_prompt: str = PromptFactory().get_general_prompt(lang)

        messages = [
            SystemMessage(content=system_prompt),
            *self._history,
            HumanMessage(content=query_string),
        ]

        response: AIMessage = self._model.invoke(messages)

        self._history.append(HumanMessage(content=query_string))

        self._history.append(AIMessage(content=response.content))

        return str(response.content)

    def main(self, query_string: str, lang: Language, is_web: bool = False) -> str:

        intent: IntentRouter.Intent = self._intent_router.get_intent(query_string)

        if intent.intent in ["disease", "farming"]:
            return self.rag_query(query_string, lang, is_web)  ## Call RAG

        return self.general_query(query_string, lang)  ## General Questions

    def greet(self, lang: Language) -> str:
        # One-shot greeting, never stored in history
        system_prompt: str = PromptFactory().get_general_prompt(lang)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Greet the farmer warmly in one sentence only."),
        ]
        response: AIMessage = self._model.invoke(messages)
        return str(response.content)


if __name__ == "__main__":

    init_query = "Greet Me!"
    language: Language = Language.HI
    rag = Rag()
    ans = rag.main(init_query, language)
    print("KisanSaathi : ", ans)

    while True:
        query: str = input("User : ")

        if query == "0":
            break

        ans = rag.main(query, language)

        print("KisanSaathi : ", ans)
