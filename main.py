#!/usr/bin/env python3
"""XMLTools - comprehensive XML toolkit for macOS."""

import sys
import tkinter as tk
import tkinter.ttk as ttk
from pathlib import Path

from app import AppState, SharedActions
from utils.xml_io import load_xml_file


def check_lxml() -> bool:
    """Check if lxml is installed.

    Returns:
        True if lxml is available
    """
    try:
        import lxml  # noqa: F401

        return True
    except ImportError:
        return False


class XMLToolsApp:
    """Main application window."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("XMLTools")
        self.root.geometry("1100x750")

        self.app_state = AppState()
        self.app_state.lxml_available = check_lxml()
        self.actions = SharedActions(self.app_state, root)

        self._build_ui()

    def _build_ui(self) -> None:
        """Build the main UI layout."""
        # Menu bar
        self._build_menu()

        # Toolbar
        toolbar = self._build_toolbar()
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        # Main notebook (tabbed interface)
        notebook = self._build_notebook()
        notebook.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Status bar
        status_bar = self._build_statusbar()
        status_bar.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

    def _build_menu(self) -> None:
        """Build menu bar."""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        # File menu
        file_menu = tk.Menu(menubar, tearoff=False)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(
            label="Open...",
            command=self._on_open,
            accelerator="Cmd+O",
        )
        file_menu.add_command(
            label="Save...",
            command=self._on_save,
            accelerator="Cmd+S",
        )
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)

        # Help menu
        help_menu = tk.Menu(menubar, tearoff=False)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self._show_about)

    def _build_toolbar(self) -> ttk.Frame:
        """Build toolbar with buttons."""
        toolbar = ttk.Frame(self.root)

        ttk.Button(toolbar, text="Open", command=self._on_open).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Save", command=self._on_save).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Clear", command=self._on_clear).pack(side=tk.LEFT, padx=2)

        ttk.Separator(toolbar, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=5)

        lxml_status = "lxml: ✓" if self.app_state.lxml_available else "lxml: ✗"
        status_label = ttk.Label(toolbar, text=lxml_status)
        status_label.pack(side=tk.RIGHT, padx=5)

        return toolbar

    def _build_notebook(self) -> ttk.Notebook:
        """Build tabbed interface with 9 empty tabs."""
        notebook = ttk.Notebook(self.root)

        tabs = [
            ("Lint", self._make_empty_tab),
            ("Format", self._make_empty_tab),
            ("Tree", self._make_empty_tab),
            ("XPath", self._make_empty_tab),
            ("Schema", self._make_empty_tab),
            ("XSLT", self._make_empty_tab),
            ("XML↔JSON", self._make_empty_tab),
            ("Diff", self._make_empty_tab),
            ("Gen XSD", self._make_empty_tab),
        ]

        for tab_name, tab_builder in tabs:
            frame = tab_builder()
            notebook.add(frame, text=tab_name)

        return notebook

    def _make_empty_tab(self) -> ttk.Frame:
        """Create an empty placeholder tab."""
        frame = ttk.Frame(self.root)
        label = ttk.Label(frame, text="(Tab placeholder)")
        label.pack(padx=20, pady=20)
        return frame

    def _build_statusbar(self) -> ttk.Label:
        """Build status bar."""
        self.status_label = ttk.Label(
            self.root,
            text="Ready",
            relief=tk.SUNKEN,
            anchor=tk.W,
        )
        return self.status_label

    def set_status(self, msg: str, level: str = "info") -> None:
        """Update status bar message.

        Args:
            msg: Status message
            level: 'info', 'error', or 'ok'
        """
        self.status_label.config(text=msg)

    def _on_open(self) -> None:
        """Handle File > Open."""
        self.actions.open_file()
        if self.app_state.current_file:
            self.set_status(f"Opened: {Path(self.app_state.current_file).name}")

    def _on_save(self) -> None:
        """Handle File > Save."""
        if not self.app_state.current_xml_text:
            self.set_status("Nothing to save", level="error")
            return

        path = self.actions.save_file(self.app_state.current_xml_text)
        if path:
            self.set_status(f"Saved: {Path(path).name}")

    def _on_clear(self) -> None:
        """Clear current XML."""
        self.app_state.current_file = None
        self.app_state.current_xml_text = ""
        self.actions.broadcast_xml("")
        self.set_status("Cleared")

    def _show_about(self) -> None:
        """Show about dialog."""
        import tkinter.messagebox as mb

        mb.showinfo(
            "About XMLTools",
            "XMLTools v1.0\n\n" "Comprehensive XML toolkit for macOS\n\n" "Features: lint, format, tree, XPath, schema, XSLT, convert, diff, XSD gen",
        )


def main():
    """Entry point."""
    root = tk.Tk()
    app = XMLToolsApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
