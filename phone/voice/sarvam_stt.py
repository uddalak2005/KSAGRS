import os
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from dotenv import load_dotenv
from utils.language_enum import Language

load_dotenv()


def create_stt() -> SarvamSTTService:
    return SarvamSTTService(
        api_key=str(os.getenv("SARVAM_API_KEY")),
        vad_analyzer=SileroVADAnalyzer(
            sample_rate=8000, params=VADParams(stop_secs=0.5)
        ),
    )
