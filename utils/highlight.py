import re
import tkinter as tk
from typing import Optional


class XMLHighlighter:
    """Syntax highlighting for XML in tkinter.Text widget."""

    # Compiled regex patterns for XML elements
    PATTERNS = {
        "tag_bracket": re.compile(r"<|>"),
        "tag_name": re.compile(r"(?<=<)/?[a-zA-Z_][a-zA-Z0-9_:.-]*"),
        "tag_attr_name": re.compile(r'(?<= )[a-zA-Z_][a-zA-Z0-9_:.-]*(?==)'),
        "tag_attr_value": re.compile(r'(?<==")[^"]*(?=")'),
        "comment": re.compile(r"<!--.*?-->", re.DOTALL),
        "cdata": re.compile(r"<!\[CDATA\[.*?\]\]>", re.DOTALL),
        "pi": re.compile(r"<\?.*?\?>", re.DOTALL),
        "entity": re.compile(r"&[a-zA-Z][a-zA-Z0-9]*;"),
    }

    # Color scheme (macOS light mode friendly)
    TAG_COLORS = {
        "tag_bracket": "#666666",
        "tag_name": "#0550AE",
        "tag_attr_name": "#116329",
        "tag_attr_value": "#A31515",
        "comment": "#6A737D",
        "cdata": "#005CC5",
        "pi": "#6F42C1",
        "entity": "#E36209",
    }

    def __init__(self, text_widget: tk.Text):
        self.text = text_widget
        self._highlight_scheduled = False
        self._configure_tags()

    def _configure_tags(self) -> None:
        """Configure tkinter Text tags for colors."""
        for tag_name, color in self.TAG_COLORS.items():
            self.text.tag_config(tag_name, foreground=color)

    def schedule(self, delay_ms: int = 150) -> None:
        """Schedule a highlight run, debounced.

        Args:
            delay_ms: Debounce delay in milliseconds
        """
        if self._highlight_scheduled:
            return

        self._highlight_scheduled = True

        def do_highlight():
            self.highlight_all()
            self._highlight_scheduled = False

        self.text.after(delay_ms, do_highlight)

    def highlight_all(self) -> None:
        """Re-highlight the entire text widget."""
        # Remove all highlighting tags
        for tag in self.TAG_COLORS:
            self.text.tag_remove(tag, "1.0", tk.END)

        content = self.text.get("1.0", tk.END)
        if not content:
            return

        # Build line-offset map for fast index conversion
        line_starts = [0]
        for i, char in enumerate(content):
            if char == "\n":
                line_starts.append(i + 1)

        # Apply tags in priority order
        for tag_name in [
            "comment",
            "cdata",
            "pi",
            "tag_bracket",
            "tag_name",
            "tag_attr_name",
            "tag_attr_value",
            "entity",
        ]:
            pattern = self.PATTERNS[tag_name]
            for match in pattern.finditer(content):
                start_idx = self._offset_to_index(match.start(), line_starts)
                end_idx = self._offset_to_index(match.end(), line_starts)
                self.text.tag_add(tag_name, start_idx, end_idx)

    def _offset_to_index(self, offset: int, line_starts: list[int]) -> str:
        """Convert a string offset to tkinter line.col index.

        Args:
            offset: Byte offset in text
            line_starts: Pre-computed line start offsets

        Returns:
            Index as 'line.col' (1-indexed)
        """
        # Binary search for the line
        line_num = 0
        for i, start in enumerate(line_starts):
            if start > offset:
                line_num = i
                break
        else:
            line_num = len(line_starts)

        col = offset - line_starts[line_num - 1]
        return f"{line_num}.{col}"
