"""XSD generation from sample XML."""

import tkinter as tk
import tkinter.ttk as ttk
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

from app import AppState, SharedActions


@dataclass
class ElementSchema:
    """Schema information for an element."""

    tag: str
    path: str
    children: dict[str, "ElementSchema"] = field(default_factory=dict)
    attributes: dict[str, set[str]] = field(default_factory=dict)
    text_values: list[str] = field(default_factory=list)
    min_occurs: int = 1
    max_occurs: int = 1
    is_mixed: bool = False


class XsdGenerateTab(ttk.Frame):
    """Tab for generating XSD from sample XML."""

    def __init__(self, parent, app_state: AppState, actions: SharedActions):
        super().__init__(parent)
        self.app_state = app_state
        self.actions = actions
        self.setup_ui()

        self.actions.register_broadcaster(self.on_xml_loaded)

    def setup_ui(self) -> None:
        """Build the XSD generation tab UI."""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="Generate XSD", command=self.run_generate).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Save XSD", command=self._save_output).pack(side=tk.LEFT, padx=2)

        # Paned window: input | output
        paned = ttk.PanedWindow(self, orient=tk.VERTICAL)
        paned.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Input
        input_frame = ttk.Frame(paned)
        ttk.Label(input_frame, text="Sample XML:").pack(anchor=tk.W)
        self.input_text = tk.Text(input_frame, wrap=tk.WORD, height=10)
        self.input_text.pack(fill=tk.BOTH, expand=True)
        paned.add(input_frame, weight=1)

        # Output
        output_frame = ttk.Frame(paned)
        ttk.Label(output_frame, text="Generated XSD:").pack(anchor=tk.W)
        self.output_text = tk.Text(output_frame, wrap=tk.WORD, height=10)
        self.output_text.pack(fill=tk.BOTH, expand=True)
        paned.add(output_frame, weight=1)

    def on_xml_loaded(self, xml_text: str) -> None:
        """Called when XML is loaded."""
        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", xml_text)

    def run_generate(self) -> None:
        """Generate XSD from sample XML."""
        xml_text = self.input_text.get("1.0", tk.END).strip()
        if not xml_text:
            return

        try:
            root = ET.fromstring(xml_text)
            schema = self._analyze(root)
            xsd_str = self._emit_xsd(schema)

            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", xsd_str)
        except Exception as e:
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", f"Error: {e}")

    def _analyze(self, root: ET.Element) -> ElementSchema:
        """Analyze XML structure."""
        schema = ElementSchema(tag=root.tag, path=f"/{root.tag}")

        for child in root:
            if child.tag not in schema.children:
                schema.children[child.tag] = ElementSchema(tag=child.tag, path=f"{schema.path}/{child.tag}")
            self._analyze_node(child, schema.children[child.tag], schema.path)

        if root.text and root.text.strip():
            schema.text_values.append(root.text.strip())
            schema.is_mixed = True

        return schema

    def _analyze_node(self, elem: ET.Element, schema: ElementSchema, parent_path: str) -> None:
        """Recursively analyze a node."""
        for child in elem:
            if child.tag not in schema.children:
                schema.children[child.tag] = ElementSchema(tag=child.tag, path=f"{schema.path}/{child.tag}")
            self._analyze_node(child, schema.children[child.tag], schema.path)

        if elem.text and elem.text.strip():
            schema.text_values.append(elem.text.strip())
            schema.is_mixed = True

        for attr_name, attr_value in elem.attrib.items():
            if attr_name not in schema.attributes:
                schema.attributes[attr_name] = set()
            schema.attributes[attr_name].add(attr_value)

    def _infer_type(self, values: list[str]) -> str:
        """Infer XSD type from values."""
        if not values:
            return "xs:string"

        # Try int
        try:
            for v in values:
                int(v)
            return "xs:integer"
        except ValueError:
            pass

        # Try float
        try:
            for v in values:
                float(v)
            return "xs:decimal"
        except ValueError:
            pass

        return "xs:string"

    def _emit_xsd(self, schema: ElementSchema, indent: int = 0) -> str:
        """Generate XSD as string."""
        lines = []

        if indent == 0:
            lines.append('<?xml version="1.0" encoding="UTF-8"?>')
            lines.append(
                '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">'
            )

        # Main element
        elem_lines = self._emit_element(schema, indent + 1)
        lines.extend(elem_lines)

        if indent == 0:
            lines.append("</xs:schema>")

        return "\n".join(lines)

    def _emit_element(self, schema: ElementSchema, indent: int) -> list[str]:
        """Emit element definition."""
        ind = "  " * indent
        lines = []

        if not schema.children and not schema.attributes:
            # Simple type
            elem_type = self._infer_type(schema.text_values)
            lines.append(f'{ind}<xs:element name="{schema.tag}" type="{elem_type}"/>')
        else:
            # Complex type
            lines.append(f'{ind}<xs:element name="{schema.tag}">')
            lines.append(f'{ind}  <xs:complexType>')
            lines.append(f'{ind}    <xs:sequence>')

            for child_tag, child_schema in schema.children.items():
                child_lines = self._emit_element(child_schema, indent + 3)
                lines.extend(child_lines)

            lines.append(f'{ind}    </xs:sequence>')

            # Attributes
            for attr_name in schema.attributes:
                lines.append(f'{ind}    <xs:attribute name="{attr_name}" type="xs:string"/>')

            lines.append(f'{ind}  </xs:complexType>')
            lines.append(f'{ind}</xs:element>')

        return lines

    def _save_output(self) -> None:
        """Save XSD to file."""
        output = self.output_text.get("1.0", tk.END)
        self.actions.save_file(output, default_name="generated.xsd", default_ext=".xsd")
