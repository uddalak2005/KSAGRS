import os
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.services.sarvam.tts import SarvamTTSService
from utils.language_enum import Language, LANGUAGE_MAP
from pipecat.transcriptions.language import Language as PipecatLanguage
from dotenv import load_dotenv

load_dotenv()

from typing import Dict

# Define the optimal voice for each language context
VOICE_MAP: Dict[Language, str] = {
    Language.HI: "shubh",  # Excellent, natural male Hindi voice
    Language.BN: "ritu",  # Highly natural female Bengali voice
    Language.TE: "pooja",  # Fluent, clear female Telugu voice
    Language.EN: "amit",  # Standard Indian-English fallback voice
}


def create_tts(lang: Language) -> SarvamTTSService:
    pipecat_lang = LANGUAGE_MAP.get(lang, PipecatLanguage.HI_IN)

    # Dynamically select the voice; fallback to "shubh" if language not found
    selected_voice = VOICE_MAP.get(lang, "shubh")

    return SarvamTTSService(
        api_key=str(os.getenv("SARVAM_API_KEY")),
        sample_rate=8000,  # Optimized for telephonic bandwidth over LiveKit
        settings=SarvamTTSService.Settings(
            voice=selected_voice,
            model="bulbul:v3",
            language=pipecat_lang,
        ),
        vad_analyzer=SileroVADAnalyzer(
            sample_rate=8000,
            params=VADParams(
                stop_secs=0.5
            ),  # 0.5s silence buffer prevents mid-sentence cutoffs
        ),
    )
