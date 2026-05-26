import xml.etree.ElementTree as ET
from pathlib import Path
from xml.dom import minidom
from typing import Optional

from .subprocess_runner import run_xmllint


def load_xml_file(path: str) -> str:
    """Load XML file and return as string.

    Reads file in binary mode to preserve encoding declaration.

    Args:
        path: Path to XML file

    Returns:
        Raw XML content as string

    Raises:
        FileNotFoundError: If file doesn't exist
        UnicodeDecodeError: If file encoding is invalid
    """
    with open(path, "rb") as f:
        content = f.read()

    # Try UTF-8 first, fall back to latin-1 (which accepts all bytes)
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


def save_xml_file(path: str, content: str) -> None:
    """Save XML content to file.

    Args:
        path: Path to save to
        content: XML content as string
    """
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def parse_to_etree(xml_text: str) -> ET.Element:
    """Parse XML string to ElementTree.

    Args:
        xml_text: XML content as string

    Returns:
        Root Element

    Raises:
        ET.ParseError: If XML is malformed
    """
    return ET.fromstring(xml_text)


def pretty_print(xml_text: str) -> str:
    """Format XML with indentation using minidom.

    Args:
        xml_text: Raw XML string

    Returns:
        Formatted XML string

    Raises:
        ET.ParseError: If XML is malformed
    """
    try:
        # Parse to validate
        ET.fromstring(xml_text)
        # Use minidom for pretty printing
        dom = minidom.parseString(xml_text)
        pretty = dom.toprettyxml(indent="  ")
        # Remove extra blank lines and the XML declaration (minidom adds it)
        lines = pretty.split("\n")
        # Keep declaration if present, skip blank lines
        result = []
        for i, line in enumerate(lines):
            if line.strip():
                result.append(line)
        return "\n".join(result)
    except ET.ParseError as e:
        raise e


def elem_path(elem: ET.Element, root: Optional[ET.Element] = None) -> str:
    """Get XPath-like path to an element.

    Args:
        elem: Target element
        root: Root element (for context, optional)

    Returns:
        Path like '/root/item[2]/name'
    """
    path = []
    current = elem
    parent_map = {c: p for p in root.iter() for c in p} if root else {}

    while current is not None:
        tag = current.tag
        # Count position among siblings with same tag
        if current in parent_map:
            parent = parent_map[current]
            siblings = [c for c in parent if c.tag == tag]
            index = siblings.index(current) + 1
            path.append(f"{tag}[{index}]")
            current = parent
        else:
            path.append(tag)
            break

    return "/" + "/".join(reversed(path))
