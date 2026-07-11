from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from typing import Optional


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribe(BaseModel):
    endpoint: str
    keys: PushKeys
    breaking: bool = True
    morning: bool = True

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class PushPreferencesUpdate(BaseModel):
    endpoint: str
    breaking: Optional[bool] = None
    morning: Optional[bool] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class PushUnsubscribe(BaseModel):
    endpoint: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True
