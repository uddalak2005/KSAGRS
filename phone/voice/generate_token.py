import os
import datetime
from livekit import api
from dotenv import load_dotenv

load_dotenv()


def generate_token(room_name: str, participant_name: str = "bot") -> str:
    token = (
        api.AccessToken(
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
        )
        .with_identity(participant_name)
        .with_name(participant_name)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .with_ttl(datetime.timedelta(hours=1))  # ← timedelta, not int
        .to_jwt()
    )
    return token
