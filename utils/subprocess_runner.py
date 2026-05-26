import subprocess
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class ToolResult:
    """Result of a tool subprocess execution."""
    returncode: int
    stdout: str
    stderr: str

    @property
    def success(self) -> bool:
        return self.returncode == 0


def run_tool(
    cmd: list[str],
    stdin: Optional[bytes] = None,
    timeout: int = 30,
) -> ToolResult:
    """Execute a command and return its output.

    Args:
        cmd: Command list (e.g., ['xmllint', '--noout', 'file.xml'])
        stdin: Optional stdin bytes to pipe
        timeout: Timeout in seconds

    Returns:
        ToolResult with returncode, stdout, stderr
    """
    try:
        result = subprocess.run(
            cmd,
            input=stdin,
            capture_output=True,
            timeout=timeout,
            text=True,
        )
        return ToolResult(
            returncode=result.returncode,
            stdout=result.stdout,
            stderr=result.stderr,
        )
    except subprocess.TimeoutExpired:
        return ToolResult(
            returncode=-1,
            stdout="",
            stderr=f"Command timed out after {timeout} seconds",
        )
    except FileNotFoundError as e:
        return ToolResult(
            returncode=-1,
            stdout="",
            stderr=f"Command not found: {e}",
        )


def run_xmllint(
    args: list[str],
    xml_input: Optional[bytes] = None,
    xml_path: Optional[str] = None,
) -> ToolResult:
    """Run xmllint with given arguments.

    Always passes --nonet for security (prevents external entity expansion).

    Args:
        args: Additional xmllint arguments (e.g., ['--noout', '--schema', 'file.xsd'])
        xml_input: Optional XML bytes to pipe via stdin
        xml_path: Optional XML file path (used instead of stdin if provided)

    Returns:
        ToolResult
    """
    cmd = ["/usr/bin/xmllint", "--nonet"] + args

    if xml_path:
        cmd.append(xml_path)

    return run_tool(cmd, stdin=xml_input)


def run_xsltproc(
    xsl_path: str,
    xml_path: str,
    params: Optional[dict[str, str]] = None,
) -> ToolResult:
    """Run xsltproc to apply an XSL stylesheet to XML.

    Args:
        xsl_path: Path to .xsl file
        xml_path: Path to XML input file
        params: Optional dict of XSL parameters (e.g., {'name': 'value'})

    Returns:
        ToolResult with transformed output in stdout
    """
    cmd = ["/usr/bin/xsltproc"]

    if params:
        for key, value in params.items():
            cmd.extend(["--stringparam", key, value])

    cmd.extend([xsl_path, xml_path])

    return run_tool(cmd)


@contextmanager
def with_tempfile(content: bytes, suffix: str = ".xml"):
    """Context manager: write bytes to a temp file, yield path, then clean up.

    Args:
        content: Bytes to write to temp file
        suffix: File extension (e.g., '.xml', '.xsd')

    Yields:
        Path to the temp file (as string)
    """
    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        import os
        os.write(fd, content)
        os.close(fd)
        yield path
    finally:
        Path(path).unlink(missing_ok=True)
