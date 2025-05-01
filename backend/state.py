# backend/state.py

from fastapi import Depends, HTTPException
from typing import Optional

class State:
    def __init__(self):
        self._file_path: Optional[str] = None

    def set_file_path(self, path: str):
        self._file_path = path

    def get_file_path(self) -> str:
        if not self._file_path:
            raise HTTPException(status_code=400, detail="No file has been uploaded. Please upload a file first.")
        return self._file_path

# Create a singleton instance
state = State()

# Dependency to get the state
def get_state() -> State:
    return state
