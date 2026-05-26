"""XSLT transformation tab."""

import tkinter as tk
import tkinter.ttk as ttk
from pathlib import Path
from tkinter import filedialog

from app import AppState, SharedActions
from utils.subprocess_runner import run_xsltproc


class XSLTTransformTab(ttk.Frame):
    """Tab for XSLT transformations."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.xsl_path: str = ""
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the XSLT tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Load XSL", command=self._load_xsl).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Transform", command=self.run_transform).pack(side=tk.LEFT, padx=2)

        self.xsl_label = ttk.Label(toolbar, text="No XSL loaded")
        self.xsl_label.pack(side=tk.LEFT, padx=10)

        # 3-pane horizontal layout
        paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # XML pane
        xml_frame = ttk.Frame(paned)
        ttk.Label(xml_frame, text="XML:").pack(anchor=tk.W)
        self.xml_text = tk.Text(xml_frame, wrap=tk.WORD)
        self.xml_text.pack(fill=tk.BOTH, expand=True)
        paned.add(xml_frame, weight=1)

        # XSL pane (read-only preview)
        xsl_frame = ttk.Frame(paned)
        ttk.Label(xsl_frame, text="XSL:").pack(anchor=tk.W)
        self.xsl_text = tk.Text(xsl_frame, wrap=tk.WORD, state=tk.DISABLED)
        self.xsl_text.pack(fill=tk.BOTH, expand=True)
        paned.add(xsl_frame, weight=1)

        # Output pane
        output_frame = ttk.Frame(paned)
        ttk.Label(output_frame, text="Output:").pack(anchor=tk.W)
        self.output_text = tk.Text(output_frame, wrap=tk.WORD)
        self.output_text.pack(fill=tk.BOTH, expand=True)
        paned.add(output_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.xml_text.delete("1.0", tk.END)
        self.xml_text.insert("1.0", xml_text)

    def _load_xsl(self) -> None:
        """Open file dialog to load XSL."""
        path = filedialog.askopenfilename(
            title="Select XSL Stylesheet",
            filetypes=[("XSL files", "*.xsl *.xslt"), ("All files", "*.*")],
        )
        if path:
            self.xsl_path = path
            filename = Path(path).name
            self.xsl_label.config(text=f"XSL: {filename}")

            # Load XSL preview
            try:
                with open(path, "r") as f:
                    xsl_content = f.read()
                self.xsl_text.config(state=tk.NORMAL)
                self.xsl_text.delete("1.0", tk.END)
                self.xsl_text.insert("1.0", xsl_content)
                self.xsl_text.config(state=tk.DISABLED)
            except Exception as e:
                self.xsl_text.config(state=tk.NORMAL)
                self.xsl_text.delete("1.0", tk.END)
                self.xsl_text.insert("1.0", f"Error reading XSL: {e}")
                self.xsl_text.config(state=tk.DISABLED)

    def run_transform(self) -> None:
        """Execute XSLT transformation."""
        if not self.xsl_path:
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", "Please load an XSL file first")
            return

        xml_text = self.xml_text.get("1.0", tk.END)
        if not xml_text.strip():
            return

        # Write XML to temp file for xsltproc
        from utils.subprocess_runner import with_tempfile

        with with_tempfile(xml_text.encode("utf-8"), ".xml") as xml_path:
            result = run_xsltproc(self.xsl_path, xml_path)

        self.output_text.delete("1.0", tk.END)

        if result.success:
            self.output_text.insert("1.0", result.stdout)
        else:
            error_msg = result.stderr or result.stdout
            self.output_text.insert("1.0", error_msg)
