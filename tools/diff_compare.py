"""XML diff/compare tab."""

import difflib
import tkinter as tk
import tkinter.ttk as ttk
from tkinter import filedialog

from app import AppState, SharedActions
from utils.xml_io import load_xml_file, pretty_print


class DiffCompareTab(ttk.Frame):
    """Tab for comparing two XML files."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

    def setup_ui(self) -> None:
        """Build the diff tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Load File A", command=self._load_file_a).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Load File B", command=self._load_file_b).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Compare", command=self.run_diff).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Export Diff", command=self._export_diff).pack(side=tk.LEFT, padx=2)

        # Paned window: A | B
        paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # File A
        frame_a = ttk.Frame(paned)
        ttk.Label(frame_a, text="File A:").pack(anchor=tk.W)
        self.text_a = tk.Text(frame_a, wrap=tk.WORD)
        self.text_a.pack(fill=tk.BOTH, expand=True)
        paned.add(frame_a, weight=1)

        # File B
        frame_b = ttk.Frame(paned)
        ttk.Label(frame_b, text="File B:").pack(anchor=tk.W)
        self.text_b = tk.Text(frame_b, wrap=tk.WORD)
        self.text_b.pack(fill=tk.BOTH, expand=True)
        paned.add(frame_b, weight=1)

        # Summary
        self.summary_label = ttk.Label(self, text="Load two files to compare")
        self.summary_label.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

    def _load_file_a(self) -> None:
        """Load File A."""
        path = filedialog.askopenfilename(title="Open File A", filetypes=[("XML files", "*.xml")])
        if path:
            try:
                content = load_xml_file(path)
                self.text_a.delete("1.0", tk.END)
                self.text_a.insert("1.0", content)
            except Exception as e:
                self.text_a.delete("1.0", tk.END)
                self.text_a.insert("1.0", f"Error: {e}")

    def _load_file_b(self) -> None:
        """Load File B."""
        path = filedialog.askopenfilename(title="Open File B", filetypes=[("XML files", "*.xml")])
        if path:
            try:
                content = load_xml_file(path)
                self.text_b.delete("1.0", tk.END)
                self.text_b.insert("1.0", content)
            except Exception as e:
                self.text_b.delete("1.0", tk.END)
                self.text_b.insert("1.0", f"Error: {e}")

    def run_diff(self) -> None:
        """Compare the two files."""
        text_a = self.text_a.get("1.0", tk.END).strip()
        text_b = self.text_b.get("1.0", tk.END).strip()

        if not text_a or not text_b:
            self.summary_label.config(text="Load both files to compare")
            return

        try:
            # Normalize both
            formatted_a = pretty_print(text_a)
            formatted_b = pretty_print(text_b)

            lines_a = formatted_a.split("\n")
            lines_b = formatted_b.split("\n")

            # Compute diff
            matcher = difflib.SequenceMatcher(None, lines_a, lines_b)
            opcodes = matcher.get_opcodes()

            # Count changes
            added = sum(1 for op, _, _, j, k in opcodes if op == "insert" for _ in range(k - j))
            deleted = sum(1 for op, i, j, _, _ in opcodes if op == "delete" for _ in range(j - i))
            changed = sum(1 for op, i, j, k, l in opcodes if op == "replace" for _ in range(j - i))

            self.summary_label.config(
                text=f"Diff: {added} added, {deleted} deleted, {changed} changed"
            )

            # Apply colors
            self._color_diff(self.text_a, self.text_b, opcodes, lines_a, lines_b)
        except Exception as e:
            self.summary_label.config(text=f"Error: {e}")

    def _color_diff(self, widget_a, widget_b, opcodes, lines_a, lines_b) -> None:
        """Color the diff regions."""
        # Clear tags
        for tag in ["deleted", "inserted", "changed"]:
            widget_a.tag_delete(tag)
            widget_b.tag_delete(tag)

        # Configure colors
        widget_a.tag_config("deleted", background="#FFEEEE")
        widget_b.tag_config("inserted", background="#EEFFEE")

        line_a, line_b = 1, 1

        for op, i, j, k, l in opcodes:
            if op == "delete":
                for _ in range(j - i):
                    widget_a.tag_add("deleted", f"{line_a}.0", f"{line_a}.end")
                    line_a += 1
            elif op == "insert":
                for _ in range(l - k):
                    widget_b.tag_add("inserted", f"{line_b}.0", f"{line_b}.end")
                    line_b += 1
            elif op == "replace":
                for _ in range(j - i):
                    widget_a.tag_add("deleted", f"{line_a}.0", f"{line_a}.end")
                    line_a += 1
                for _ in range(l - k):
                    widget_b.tag_add("inserted", f"{line_b}.0", f"{line_b}.end")
                    line_b += 1
            else:  # equal
                line_a += j - i
                line_b += l - k

    def _export_diff(self) -> None:
        """Export comparison result."""
        text_a = self.text_a.get("1.0", tk.END)
        text_b = self.text_b.get("1.0", tk.END)

        if not text_a.strip() or not text_b.strip():
            return

        # Create a diff report
        report = f"=== File A ===\n{text_a}\n\n=== File B ===\n{text_b}"
        self.actions.save_file(report, default_name="diff_report.txt", default_ext=".txt")
