import os

from dotenv import load_dotenv

from pipecat.services.groq.llm import GroqLLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import Frame, TranscriptionFrame, LLMUpdateSettingsFrame

from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
    LLMAssistantAggregatorParams,
)
from pipecat.audio.vad.silero import SileroVADAnalyzer

from rag.prompt_factory import PromptFactory
from utils.language_enum import Language

from rag.retriever import Retriever

load_dotenv()


class RAGContextInjector(FrameProcessor):
    def __init__(self, retriever: Retriever, context: LLMContext):
        super().__init__()
        self._retriever = retriever
        self._context = context

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        """
        Intercepts user transcription frames, queries vector storage,
        and updates system settings frames safely before passing downstream.
        """
        # Call parent handler to let core state mechanics settle
        await super().process_frame(frame, direction)

        # Check if STT finalized a complete speech-to-text chunk
        if isinstance(frame, TranscriptionFrame) and frame.finalized:
            user_query = frame.text

            # 1. Pull relevant documents using your custom retriever
            fetched_context = self._retriever.retrieve(user_query)

            # 2. Generate the prompt by passing the dynamic retrieved context
            enriched_instruction = PromptFactory.get_rag_prompt(
                lang=Language.HI, rag_context=fetched_context, is_web=False
            )

            # 3. Securely pass a Settings update downstream before the transcription text hits Groq
            await self.push_frame(
                LLMUpdateSettingsFrame(
                    delta=GroqLLMService.Settings(
                        system_instruction=enriched_instruction
                    )
                ),
                direction,
            )

        # 4. Push the original transcription frame down the line natively (No yield!)
        await self.push_frame(frame, direction)


# --- Main Factory Function ---
def create_groq_llm(
    language: Language,
) -> tuple[GroqLLMService, LLMContextAggregatorPair, RAGContextInjector]:
    # FIX: Initialize with a placeholder context or general greeting prompt before user asks a query
    initial_system_instruction = PromptFactory.get_general_prompt(lang=language)

    # Empty context initialization for clean chat history tracking
    context = LLMContext()

    # Configure Groq LLM
    llm = GroqLLMService(
        api_key=str(os.getenv("GROQ_API_KEY")),
        settings=GroqLLMService.Settings(
            model="llama-3.3-70b-versatile",
            system_instruction=initial_system_instruction,
            temperature=0.7,
            max_completion_tokens=150,
        ),
    )

    # Universally track bidirectional user and assistant interactions
    aggregators = LLMContextAggregatorPair(
        context=context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(sample_rate=8000)
        ),
        assistant_params=LLMAssistantAggregatorParams(),
    )

    # Initialize retriever and custom injector
    retriever = Retriever()
    rag_injector = RAGContextInjector(retriever=retriever, context=context)

    return llm, aggregators, rag_injector
