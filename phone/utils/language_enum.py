from enum import Enum
from pipecat.transcriptions.language import Language as PipecatLanguage


class Language(str, Enum):
    EN = "english"
    HI = "hindi"
    BN = "bengali"
    TE = "telugu"


LANGUAGE_MAP = {
    Language.EN: PipecatLanguage.EN_IN,
    Language.HI: PipecatLanguage.HI_IN,
    Language.BN: PipecatLanguage.BN_IN,
    Language.TE: PipecatLanguage.TE_IN,
}
