"""XPath query tab: element selection via XPath expressions."""

import tkinter as tk
import tkinter.ttk as ttk

from app import AppState, SharedActions
from utils.subprocess_runner import run_xmllint


class XPathQueryTab(ttk.Frame):
    """Tab for XPath queries."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the XPath tab UI."""
        # Query toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Label(toolbar, text="XPath:").pack(side=tk.LEFT, padx=2)

        self.query_var = tk.StringVar()
        self.query_entry = ttk.Combobox(toolbar, textvariable=self.query_var, width=40)
        self.query_entry.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        self.query_entry.bind("<Return>", lambda e: self.run_query())

        ttk.Button(toolbar, text="Query", command=self.run_query).pack(side=tk.LEFT, padx=2)

        # Paned window: editor | results
        paned = ttk.PanedWindow(self, orient=tk.VERTICAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Editor
        editor_frame = ttk.Frame(paned)
        ttk.Label(editor_frame, text="XML:").pack(anchor=tk.W)
        self.editor = tk.Text(editor_frame, wrap=tk.WORD, height=10)
        self.editor.pack(fill=tk.BOTH, expand=True)
        paned.add(editor_frame, weight=2)

        # Results
        results_frame = ttk.Frame(paned)
        ttk.Label(results_frame, text="Results:").pack(anchor=tk.W)
        self.results_text = tk.Text(results_frame, wrap=tk.WORD, height=5)
        self.results_text.pack(fill=tk.BOTH, expand=True)
        paned.add(results_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.editor.delete("1.0", tk.END)
        self.editor.insert("1.0", xml_text)

    def run_query(self) -> None:
        """Execute the XPath query."""
        query = self.query_var.get()
        xml_text = self.editor.get("1.0", tk.END)

        if not query or not xml_text.strip():
            self.results_text.delete("1.0", tk.END)
            self.results_text.insert("1.0", "Enter a query and XML")
            return

        # Add to history
        if query not in self.query_entry["values"]:
            values = list(self.query_entry["values"])
            values.append(query)
            self.query_entry["values"] = values

        # Run xmllint with XPath
        result = run_xmllint(
            ["--xpath", query],
            xml_input=xml_text.encode("utf-8"),
        )

        self.results_text.delete("1.0", tk.END)

        if result.success:
            output = result.stdout or "(empty result)"
            self.results_text.insert("1.0", output)
        else:
            error = result.stderr or result.stdout
            self.results_text.insert("1.0", f"Error: {error}")
