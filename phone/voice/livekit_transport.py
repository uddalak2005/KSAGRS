import os
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from dotenv import load_dotenv

load_dotenv()


def create_transport(token: str) -> LiveKitTransport:
    return LiveKitTransport(
        url=str(os.getenv("LIVEKIT_URL")),
        token=token,
        room_name=str(os.getenv("LIVEKIT_ROOM")),
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )
