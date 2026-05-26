"""Pretty-print tab: XML formatting."""

import tkinter as tk
import tkinter.ttk as ttk

from app import AppState, SharedActions
from utils.xml_io import pretty_print


class PrettyPrintTab(ttk.Frame):
    """Tab for formatting XML."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the pretty-print tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Format", command=self.format_xml).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Copy Output", command=self._copy_output).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="Save Output", command=self._save_output).pack(
            side=tk.LEFT, padx=2
        )

        # Paned window: input | output
        paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Input
        input_frame = ttk.Frame(paned)
        ttk.Label(input_frame, text="Input:").pack(anchor=tk.W)
        self.input_text = tk.Text(input_frame, wrap=tk.WORD)
        self.input_text.pack(fill=tk.BOTH, expand=True)
        paned.add(input_frame, weight=1)

        # Output
        output_frame = ttk.Frame(paned)
        ttk.Label(output_frame, text="Output:").pack(anchor=tk.W)
        self.output_text = tk.Text(output_frame, wrap=tk.WORD)
        self.output_text.pack(fill=tk.BOTH, expand=True)
        paned.add(output_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", xml_text)

    def format_xml(self) -> None:
        """Format the input XML."""
        xml_text = self.input_text.get("1.0", tk.END)
        if not xml_text.strip():
            return

        try:
            formatted = pretty_print(xml_text)
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", formatted)
        except Exception as e:
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", f"Error: {e}")

    def _copy_output(self) -> None:
        """Copy output to clipboard."""
        output = self.output_text.get("1.0", tk.END)
        self.clipboard_clear()
        self.clipboard_append(output)

    def _save_output(self) -> None:
        """Save output to file."""
        output = self.output_text.get("1.0", tk.END)
        self.actions.save_file(output, default_name="formatted.xml")
