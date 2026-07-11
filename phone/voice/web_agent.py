import os
import asyncio
from dotenv import load_dotenv

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.pipeline.runner import PipelineRunner
from pipecat.frames.frames import TextFrame

from utils.language_enum import Language
from voice.livekit_transport import create_transport
from voice.generate_token import generate_token
from voice.sarvam_stt import create_stt
from voice.sarvam_tts import create_tts
from voice.groq_llm import create_groq_llm

load_dotenv()

# Define the local greeting map to prevent cross-language script reading issues
GREETINGS = {
    Language.HI: "राम-राम किसान भाई! मैं किसान-साथी हूँ। कहिए आज क्या मदद करूँ?",
    Language.BN: "নমস্কার চাষীভাই! আমি কিষাণ-সাথী। বলুন আজকে মাঠে কী समस्या হচ্ছে?",
    Language.TE: "నమస్తే రైతు సోదరా! నేను కిసాన్-సాథిని. ఈరోజు మీ పొలంలో సమస్య ఏమిటో చెప్పండి?",
    Language.EN: "Hello there! I'm Kisan-Sathi. How can I help you with your crops today?",
}


async def main(lang: Language = Language.BN):
    """
    Main pipeline execution. Pass the preferred Language variant directly into the
    main function initialization block to dynamically provision STT, LLM prompts, and TTS targets.
    """
    room_name = os.getenv("LIVEKIT_ROOM", "default_room")
    token = generate_token(room_name)

    transport = create_transport(token)

    # 1. Initialize Audio/Voice IO components with the assigned language
    # Note: Sarvam STT automatically detects language context, but pass lang if required by your custom wrapper
    stt = create_stt()
    tts = create_tts(lang=lang)

    # 2. Initialize RAG & Chat History with the assigned language context
    # This ensures PromptFactory picks up the localized voice/translation guardrails
    llm_service, aggregators, rag_injector = create_groq_llm(lang)

    # 3. Assemble the Pipeline in chronological flow order
    pipeline = Pipeline(
        [
            transport.input(),  # Capture WebRTC audio from LiveKit
            stt,  # Convert raw voice slices into clear text frames
            aggregators.user(),  # Append user text context to LLM conversational history
            rag_injector,  # Intercept frame, perform Chroma DB lookup, update vector context
            llm_service,  # Drive crisp responses out of Groq using localization prompts
            tts,  # Synthesize text back into audio chunks matching language speech models
            aggregators.assistant(),  # Append final answer to assistant context history
            transport.output(),  # Push streaming audio straight back into the WebRTC session channel
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,
        ),
    )

    runner = PipelineRunner()

    @transport.event_handler("on_first_participant_joined")
    async def on_first_join(_transport, _participant_id):
        # Prefixed with '_' to resolve shadowing and unused parameter warnings
        greeting_text = GREETINGS.get(lang, GREETINGS[Language.HI])
        await task.queue_frame(TextFrame(greeting_text))

    @transport.event_handler("on_participant_connected")
    async def on_participant_connected(*_args):
        # Using *_args swallows any incoming parameters safely without naming them
        return

    @transport.event_handler("on_data_received")
    async def on_data_received(*_args):
        # Using *_args swallows transport, data, and participant_id cleanly
        return

    print(
        f"Pipeline running [{lang.value} Engine]... Waiting for participant to connect."
    )
    await runner.run(task)


if __name__ == "__main__":
    # Assign the system language variant flag directly right here
    selected_language = Language.BN
    asyncio.run(main(lang=selected_language))
