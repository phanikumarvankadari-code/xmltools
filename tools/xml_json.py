"""XML ↔ JSON conversion tab."""

import json
import tkinter as tk
import tkinter.ttk as ttk
import xml.etree.ElementTree as ET

from app import AppState, SharedActions


class XmlJsonTab(ttk.Frame):
    """Tab for XML ↔ JSON conversion."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the XML ↔ JSON tab UI."""
        # Direction control
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="XML → JSON", command=self.xml_to_json).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="JSON → XML", command=self.json_to_xml).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Copy Left", command=self._copy_left).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Copy Right", command=self._copy_right).pack(side=tk.LEFT, padx=2)

        # Paned window: left | right
        paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Left pane (XML)
        left_frame = ttk.Frame(paned)
        ttk.Label(left_frame, text="XML:").pack(anchor=tk.W)
        self.left_text = tk.Text(left_frame, wrap=tk.WORD)
        self.left_text.pack(fill=tk.BOTH, expand=True)
        paned.add(left_frame, weight=1)

        # Right pane (JSON)
        right_frame = ttk.Frame(paned)
        ttk.Label(right_frame, text="JSON:").pack(anchor=tk.W)
        self.right_text = tk.Text(right_frame, wrap=tk.WORD)
        self.right_text.pack(fill=tk.BOTH, expand=True)
        paned.add(right_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.left_text.delete("1.0", tk.END)
        self.left_text.insert("1.0", xml_text)

    def xml_to_json(self) -> None:
        """Convert XML to JSON."""
        xml_text = self.left_text.get("1.0", tk.END).strip()
        if not xml_text:
            return

        try:
            root = ET.fromstring(xml_text)
            data = self._elem_to_dict(root)
            json_str = json.dumps(data, indent=2)

            self.right_text.delete("1.0", tk.END)
            self.right_text.insert("1.0", json_str)
        except Exception as e:
            self.right_text.delete("1.0", tk.END)
            self.right_text.insert("1.0", f"Error: {e}")

    def json_to_xml(self) -> None:
        """Convert JSON to XML."""
        json_text = self.right_text.get("1.0", tk.END).strip()
        if not json_text:
            return

        try:
            data = json.loads(json_text)
            # Assume first key is root element
            root_tag = list(data.keys())[0]
            root_elem = self._dict_to_elem(data[root_tag], root_tag)

            xml_str = ET.tostring(root_elem, encoding="unicode")

            self.left_text.delete("1.0", tk.END)
            self.left_text.insert("1.0", xml_str)
        except Exception as e:
            self.left_text.delete("1.0", tk.END)
            self.left_text.insert("1.0", f"Error: {e}")

    def _elem_to_dict(self, elem: ET.Element) -> dict:
        """Convert XML element to dict."""
        result = {elem.tag: {}}

        if elem.attrib:
            for key, value in elem.attrib.items():
                result[elem.tag][f"@{key}"] = value

        if elem.text and elem.text.strip():
            result[elem.tag]["#text"] = elem.text.strip()

        for child in elem:
            child_dict = self._elem_to_dict(child)
            child_tag = child.tag

            if child_tag in result[elem.tag]:
                if not isinstance(result[elem.tag][child_tag], list):
                    result[elem.tag][child_tag] = [result[elem.tag][child_tag]]
                result[elem.tag][child_tag].append(child_dict[child_tag])
            else:
                result[elem.tag][child_tag] = child_dict[child_tag]

        return result

    def _dict_to_elem(self, data: dict, tag: str) -> ET.Element:
        """Convert dict to XML element."""
        elem = ET.Element(tag)

        if isinstance(data, dict):
            for key, value in data.items():
                if key.startswith("@"):
                    # Attribute
                    elem.set(key[1:], value)
                elif key == "#text":
                    elem.text = value
                elif isinstance(value, list):
                    # Array: create multiple child elements
                    for item in value:
                        child = self._dict_to_elem(item, key)
                        elem.append(child)
                else:
                    # Single child element
                    child = self._dict_to_elem(value, key)
                    elem.append(child)
        else:
            elem.text = str(data)

        return elem

    def _copy_left(self) -> None:
        """Copy left pane (XML) to clipboard."""
        content = self.left_text.get("1.0", tk.END).strip()
        if content:
            try:
                self.clipboard_clear()
                self.clipboard_append(content)
            except tk.TclError:
                pass

    def _copy_right(self) -> None:
        """Copy right pane (JSON) to clipboard."""
        content = self.right_text.get("1.0", tk.END).strip()
        if content:
            try:
                self.clipboard_clear()
                self.clipboard_append(content)
            except tk.TclError:
                pass
