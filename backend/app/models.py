from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChatMessage(BaseModel):
    id: str | None = None
    role: Literal["user", "assistant", "system"]
    content: str
    attachments: list["ChatAttachment"] = Field(default_factory=list)
    timestamp: str | None = None


class ChatAttachment(BaseModel):
    id: str | None = None
    kind: Literal["image", "text"]
    name: str
    ext: str | None = None
    content: str | None = None
    data_url: str | None = Field(default=None, alias="dataUrl")
    media_type: str | None = Field(default=None, alias="mediaType")
    size: int | None = None

    model_config = {"populate_by_name": True}


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    session_id: str = Field(alias="sessionId")
    user_id: str | None = Field(default=None, alias="userId")
    attachments: list[ChatAttachment] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @model_validator(mode="after")
    def validate_messages(self) -> "ChatRequest":
        if not self.messages:
            raise ValueError("messages precisa ter pelo menos uma mensagem.")
        if not any(message.role == "user" for message in self.messages):
            raise ValueError("messages precisa ter pelo menos uma mensagem de usuário.")
        return self


class TraceMeta(BaseModel):
    model: str
    mode: Literal["oci"]
    prompt_name: str = Field(alias="promptName")
    prompt_label: str = Field(alias="promptLabel")
    prompt_version: str | None = Field(default=None, alias="promptVersion")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    answer: str
    used_tools: list[str] = Field(default_factory=list, alias="usedTools")
    trace_meta: TraceMeta = Field(alias="traceMeta")
