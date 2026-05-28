from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agent import SYSTEM_PROMPT
from app.config import settings
from app.langfuse_runtime import flush_langfuse, get_langfuse_client


def main() -> None:
    langfuse = get_langfuse_client()
    langfuse.create_prompt(
        name=settings.langfuse_prompt_name,
        type="text",
        prompt=SYSTEM_PROMPT,
        labels=[settings.langfuse_prompt_label],
    )
    flush_langfuse()
    print(
        "published prompt "
        f"{settings.langfuse_prompt_name!r} with label {settings.langfuse_prompt_label!r}"
    )


if __name__ == "__main__":
    main()
