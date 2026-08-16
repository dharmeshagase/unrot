from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class RootEnvironmentTest(unittest.TestCase):
    def test_root_env_is_loaded_without_overwriting_process_environment(self) -> None:
        from unrot_api.config import load_root_environment

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / ".env").write_text(
                "# local settings\nTRANSCRIPTION_PROVIDER=openai\nOPENAI_API_KEY='from-file'\nINVALID LINE\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"OPENAI_API_KEY": "from-process"}, clear=True):
                loaded = load_root_environment(root)

                self.assertEqual(os.environ["TRANSCRIPTION_PROVIDER"], "openai")
                self.assertEqual(os.environ["OPENAI_API_KEY"], "from-process")
                self.assertEqual(loaded, {"TRANSCRIPTION_PROVIDER": "openai"})

