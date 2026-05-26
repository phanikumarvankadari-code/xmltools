"""Lint tab: XML well-formedness and schema validation."""

import tkinter as tk
import tkinter.ttk as ttk
from typing import Callable

from app import AppState, SharedActions
from utils.subprocess_runner import run_xmllint


class LintTab(ttk.Frame):
    """Tab for XML linting and error reporting."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        # Register for XML broadcasts
        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the lint tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Run Lint", command=self.run_lint).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Clear", command=self._clear).pack(side=tk.LEFT, padx=2)

        # Editor pane
        paned = ttk.PanedWindow(self, orient=tk.VERTICAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # XML editor (top)
        editor_frame = ttk.Frame(paned)
        ttk.Label(editor_frame, text="XML Input:").pack(anchor=tk.W)

        self.editor = tk.Text(editor_frame, height=15, width=80, wrap=tk.WORD)
        self.editor.pack(fill=tk.BOTH, expand=True)
        paned.add(editor_frame, weight=2)

        # Error panel (bottom)
        error_frame = ttk.Frame(paned)
        ttk.Label(error_frame, text="Errors:").pack(anchor=tk.W)

        self.error_text = tk.Text(error_frame, height=5, width=80, wrap=tk.WORD)
        self.error_text.pack(fill=tk.BOTH, expand=True)
        paned.add(error_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.editor.delete("1.0", tk.END)
        self.editor.insert("1.0", xml_text)

    def run_lint(self) -> None:
        """Run xmllint on the editor content."""
        xml_text = self.editor.get("1.0", tk.END)
        if not xml_text.strip():
            self.error_text.delete("1.0", tk.END)
            self.error_text.insert("1.0", "No XML to lint")
            return

        result = run_xmllint(["--noout"], xml_input=xml_text.encode("utf-8"))

        self.error_text.delete("1.0", tk.END)

        if result.success:
            self.error_text.insert("1.0", "✓ Well-formed (no errors)")
        else:
            error_msg = result.stderr or result.stdout
            self.error_text.insert("1.0", error_msg)

    def _clear(self) -> None:
        """Clear both panes."""
        self.editor.delete("1.0", tk.END)
        self.error_text.delete("1.0", tk.END)
