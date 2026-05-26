"""Tree view tab: XML structure navigation."""

import tkinter as tk
import tkinter.ttk as ttk
import xml.etree.ElementTree as ET

from app import AppState, SharedActions


class TreeViewTab(ttk.Frame):
    """Tab for viewing XML as an expandable tree."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the tree view tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Expand All", command=self._expand_all).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Collapse All", command=self._collapse_all).pack(
            side=tk.LEFT, padx=2
        )

        # Paned window: tree | detail
        paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Tree pane
        tree_frame = ttk.Frame(paned)
        ttk.Label(tree_frame, text="Structure:").pack(anchor=tk.W)

        scrollbar = ttk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree = ttk.Treeview(tree_frame, yscrollcommand=scrollbar.set)
        self.tree.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.tree.yview)

        self.tree.bind("<<TreeviewSelect>>", self._on_node_select)

        paned.add(tree_frame, weight=1)

        # Detail pane
        detail_frame = ttk.Frame(paned)
        ttk.Label(detail_frame, text="Details:").pack(anchor=tk.W)

        self.detail_text = tk.Text(detail_frame, wrap=tk.WORD, height=10)
        self.detail_text.pack(fill=tk.BOTH, expand=True)

        paned.add(detail_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Load XML into tree."""
        self.tree.delete(*self.tree.get_children())
        self.detail_text.delete("1.0", tk.END)

        if not xml_text.strip():
            return

        try:
            root = ET.fromstring(xml_text)
            self._populate_tree(root, "")
        except ET.ParseError as e:
            self.detail_text.insert("1.0", f"Parse error: {e}")

    def _populate_tree(self, elem: ET.Element, parent_id: str) -> None:
        """Recursively populate tree with elements."""
        # Create node label
        label = elem.tag
        if elem.attrib:
            attrs = " ".join(f'{k}="{v}"' for k, v in elem.attrib.items())
            label += f" [{attrs}]"

        node_id = self.tree.insert(parent_id, "end", text=label, open=False)

        # Recursively add children
        for child in elem:
            self._populate_tree(child, node_id)

    def _on_node_select(self, event) -> None:
        """Show node details when selected."""
        selection = self.tree.selection()
        if not selection:
            return

        node_id = selection[0]
        node_text = self.tree.item(node_id, "text")

        self.detail_text.delete("1.0", tk.END)
        self.detail_text.insert("1.0", node_text)

    def _expand_all(self) -> None:
        """Expand all nodes."""

        def expand(item):
            self.tree.item(item, open=True)
            for child in self.tree.get_children(item):
                expand(child)

        for item in self.tree.get_children():
            expand(item)

    def _collapse_all(self) -> None:
        """Collapse all nodes."""

        def collapse(item):
            self.tree.item(item, open=False)
            for child in self.tree.get_children(item):
                collapse(child)

        for item in self.tree.get_children():
            collapse(item)
