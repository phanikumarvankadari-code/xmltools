import tkinter as tk
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import filedialog
from typing import Callable, Optional

from utils.xml_io import load_xml_file, save_xml_file


@dataclass
class AppState:
    """Global application state."""

    current_file: Optional[str] = None
    current_xml_text: str = ""
    lxml_available: bool = False
    xml_broadcasters: list[Callable[[str], None]] = field(default_factory=list)


class SharedActions:
    """Shared file and broadcast actions accessible from all tabs."""

    def __init__(self, app_state: AppState, root: tk.Tk):
        self.state = app_state
        self.root = root

    def open_file(self, on_loaded: Optional[Callable[[str, str], None]] = None) -> None:
        """Open a file dialog and load XML.

        Args:
            on_loaded: Callback(file_path, xml_text) after loading
        """
        file_path = filedialog.askopenfilename(
            title="Open XML File",
            filetypes=[("XML files", "*.xml"), ("All files", "*.*")],
        )
        if not file_path:
            return

        try:
            xml_text = load_xml_file(file_path)
            self.state.current_file = file_path
            self.state.current_xml_text = xml_text
            self.broadcast_xml(xml_text)

            if on_loaded:
                on_loaded(file_path, xml_text)
        except Exception as e:
            # Would show error dialog in main window
            print(f"Error loading file: {e}")

    def save_file(
        self,
        content: str,
        default_name: str = "output.xml",
        default_ext: str = ".xml",
    ) -> Optional[str]:
        """Save content to a file dialog.

        Args:
            content: XML/text content to save
            default_name: Default filename
            default_ext: Default extension

        Returns:
            Path if saved, None if cancelled
        """
        file_path = filedialog.asksaveasfilename(
            title="Save As",
            defaultextension=default_ext,
            initialfile=default_name,
            filetypes=[("XML files", "*.xml"), ("JSON files", "*.json"), ("All files", "*.*")],
        )
        if not file_path:
            return None

        try:
            save_xml_file(file_path, content)
            return file_path
        except Exception as e:
            print(f"Error saving file: {e}")
            return None

    def broadcast_xml(self, xml_text: str) -> None:
        """Broadcast XML text to all registered tabs.

        Args:
            xml_text: XML content to broadcast
        """
        self.state.current_xml_text = xml_text
        for broadcaster in self.state.xml_broadcasters:
            try:
                broadcaster(xml_text)
            except Exception as e:
                print(f"Broadcast error: {e}")

    def register_broadcaster(self, callback: Callable[[str], None]) -> None:
        """Register a tab to receive XML broadcasts.

        Args:
            callback: Function(xml_text) to call on broadcast
        """
        self.state.xml_broadcasters.append(callback)
