"""Schema validation tab: XSD/DTD validation."""

import re
import tkinter as tk
import tkinter.ttk as ttk
from pathlib import Path
from tkinter import filedialog

from app import AppState, SharedActions
from utils.subprocess_runner import run_xmllint


class SchemaValidateTab(ttk.Frame):
    """Tab for schema (XSD/DTD) validation."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.schema_path: str = ""
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the schema validation tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Load Schema", command=self._load_schema).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Validate", command=self.run_validate).pack(side=tk.LEFT, padx=2)

        self.schema_label = ttk.Label(toolbar, text="No schema loaded")
        self.schema_label.pack(side=tk.LEFT, padx=10)

        # Paned window: editor | results
        paned = ttk.PanedWindow(self, orient=tk.VERTICAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Editor
        editor_frame = ttk.Frame(paned)
        ttk.Label(editor_frame, text="XML:").pack(anchor=tk.W)
        self.editor = tk.Text(editor_frame, wrap=tk.WORD, height=12)
        self.editor.tag_config("validation_error", background="#FFCCCC")
        self.editor.pack(fill=tk.BOTH, expand=True)
        paned.add(editor_frame, weight=2)

        # Results
        results_frame = ttk.Frame(paned)
        ttk.Label(results_frame, text="Validation Results:").pack(anchor=tk.W)
        self.results_text = tk.Text(results_frame, wrap=tk.WORD, height=5)
        self.results_text.pack(fill=tk.BOTH, expand=True)
        paned.add(results_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.editor.delete("1.0", tk.END)
        self.editor.insert("1.0", xml_text)

    def _load_schema(self) -> None:
        """Open file dialog to load schema."""
        path = filedialog.askopenfilename(
            title="Select XSD or DTD Schema",
            filetypes=[("Schema files", "*.xsd *.dtd"), ("All files", "*.*")],
        )
        if path:
            self.schema_path = path
            filename = Path(path).name
            self.schema_label.config(text=f"Schema: {filename}")

    def run_validate(self) -> None:
        """Validate XML against the loaded schema."""
        if not self.schema_path:
            self.results_text.delete("1.0", tk.END)
            self.results_text.insert("1.0", "Please load a schema first")
            return

        xml_text = self.editor.get("1.0", tk.END)
        if not xml_text.strip():
            return

        # Clear previous error highlights
        self.editor.tag_delete("validation_error")

        schema_ext = Path(self.schema_path).suffix.lower()

        if schema_ext == ".xsd":
            result = run_xmllint(
                ["--schema", self.schema_path],
                xml_input=xml_text.encode("utf-8"),
            )
        elif schema_ext == ".dtd":
            result = run_xmllint(
                ["--dtdvalid", self.schema_path],
                xml_input=xml_text.encode("utf-8"),
            )
        else:
            result = run_xmllint(
                ["--schema", self.schema_path],
                xml_input=xml_text.encode("utf-8"),
            )

        self.results_text.delete("1.0", tk.END)

        if result.success:
            self.results_text.insert("1.0", "✓ Valid")
        else:
            error_msg = result.stderr or result.stdout
            self.results_text.insert("1.0", error_msg)
            self._highlight_error_lines(error_msg)

    def _highlight_error_lines(self, error_msg: str) -> None:
        """Extract line numbers from validation errors and highlight them."""
        line_pattern = r"(?:line|:)(\d+):"
        for match in re.finditer(line_pattern, error_msg):
            line_num = int(match.group(1))
            self.editor.tag_add("validation_error", f"{line_num}.0", f"{line_num}.end")
