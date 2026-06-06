#!/usr/bin/env python3
"""
RescueVault Team - ReconVault local MCP tool installer for Kali Linux.

Default mode prints installation status only.
Use --install to install missing tools from requirements.txt.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional


BRAND = "RescueVault Team"
MANIFEST = Path(__file__).with_name("requirements.txt")
PYTHON_REQUIREMENTS = Path(__file__).with_name("server-requirements.txt")
EXPECTED_CATEGORIES = ["Recon MCP", "Network MCP", "Web MCP", "OSINT MCP", "Cloud MCP"]


@dataclass
class ToolSpec:
    category: str
    name: str
    binary: str
    installer: str


def is_root() -> bool:
    return hasattr(os, "geteuid") and os.geteuid() == 0


def has_command(binary: str) -> bool:
    return shutil.which(binary) is not None


def sudo_prefix() -> List[str]:
    if is_root():
        return []
    if shutil.which("sudo"):
        return ["sudo"]
    return []


def run_command(command: List[str], dry_run: bool = False) -> int:
    printable = " ".join(command)
    print(f"    -> {printable}")
    if dry_run:
        return 0
    try:
        return subprocess.run(command, check=False).returncode
    except FileNotFoundError:
        return 127


def parse_manifest(path: Path = MANIFEST) -> List[ToolSpec]:
    tools: List[ToolSpec] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split("|")]
        if len(parts) != 4:
            raise ValueError(f"Invalid requirements.txt line {line_number}: {raw_line}")
        tools.append(ToolSpec(*parts))
    return tools


def group_by_category(tools: Iterable[ToolSpec]) -> Dict[str, List[ToolSpec]]:
    grouped: Dict[str, List[ToolSpec]] = {category: [] for category in EXPECTED_CATEGORIES}
    for tool in tools:
        grouped.setdefault(tool.category, []).append(tool)
    return grouped


def status_symbol(installed: bool, ascii_only: bool = False) -> str:
    if ascii_only:
        return "[OK]" if installed else "[NO]"
    return "✓" if installed else "✗"


def print_status(tools: List[ToolSpec], ascii_only: bool = False) -> None:
    grouped = group_by_category(tools)
    installed_count = sum(1 for tool in tools if has_command(tool.binary))
    total_count = len(tools)

    print()
    print("ReconVault Local MCP Tool Status")
    print(f"Created by {BRAND}")
    print(f"Installed: {installed_count}/{total_count}")
    print()

    for category in EXPECTED_CATEGORIES:
        category_tools = grouped.get(category, [])
        category_installed = sum(1 for tool in category_tools if has_command(tool.binary))
        print(f"{category} ({category_installed}/{len(category_tools)})")
        for tool in category_tools:
            installed = has_command(tool.binary)
            mark = status_symbol(installed, ascii_only)
            print(f"  {tool.name:<28} {mark:<4} {tool.binary}")
        print()


def ensure_apt_updated(state: Dict[str, bool], dry_run: bool) -> None:
    if state.get("apt_updated"):
        return
    command = sudo_prefix() + ["apt-get", "update"]
    run_command(command, dry_run=dry_run)
    state["apt_updated"] = True


def install_apt(package: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_apt_updated(state, dry_run)
    command = sudo_prefix() + ["apt-get", "install", "-y", package]
    return run_command(command, dry_run=dry_run)


def ensure_pipx(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("pipx"):
        return
    if state.get("pipx_attempted"):
        return
    print("  pipx is missing; installing python3-pipx first.")
    install_apt("python3-pipx", state, dry_run)
    state["pipx_attempted"] = True


def install_pipx(package: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_pipx(state, dry_run)
    if not dry_run and not has_command("pipx"):
        return 127
    command = ["pipx", "install", package]
    result = run_command(command, dry_run=dry_run)
    if result != 0:
        command = ["pipx", "upgrade", package]
        result = run_command(command, dry_run=dry_run)
    return result


def ensure_go(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("go"):
        return
    if state.get("go_attempted"):
        return
    print("  go is missing; installing golang-go first.")
    install_apt("golang-go", state, dry_run)
    state["go_attempted"] = True


def install_go(module: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_go(state, dry_run)
    if not dry_run and not has_command("go"):
        return 127
    return run_command(["go", "install", module], dry_run=dry_run)


def ensure_gem(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("gem"):
        return
    if state.get("gem_attempted"):
        return
    print("  gem is missing; installing ruby-full first.")
    install_apt("ruby-full", state, dry_run)
    state["gem_attempted"] = True


def install_gem(package: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_gem(state, dry_run)
    if not dry_run and not has_command("gem"):
        return 127
    command = sudo_prefix() + ["gem", "install", package]
    return run_command(command, dry_run=dry_run)


def install_python_runtime(dry_run: bool = False) -> int:
    if not PYTHON_REQUIREMENTS.exists():
        return 0
    if not has_command("python3"):
        print("python3 is missing; install python3 before starting the MCP server.")
        return 127
    command = ["python3", "-m", "pip", "install", "-r", str(PYTHON_REQUIREMENTS)]
    return run_command(command, dry_run=dry_run)


def install_tool(tool: ToolSpec, state: Dict[str, bool], dry_run: bool = False) -> int:
    if ":" not in tool.installer:
        print(f"  Unsupported installer format for {tool.name}: {tool.installer}")
        return 2

    method, value = tool.installer.split(":", 1)
    method = method.strip().lower()
    value = value.strip()

    if method == "apt":
        return install_apt(value, state, dry_run)
    if method == "pipx":
        return install_pipx(value, state, dry_run)
    if method == "go":
        return install_go(value, state, dry_run)
    if method == "gem":
        return install_gem(value, state, dry_run)

    print(f"  Unsupported installer method for {tool.name}: {method}")
    return 2


def install_missing(tools: List[ToolSpec], dry_run: bool = False, include_runtime: bool = False) -> int:
    state: Dict[str, bool] = {}
    failures: List[str] = []
    missing = [tool for tool in tools if not has_command(tool.binary)]

    if include_runtime:
        print("Installing local MCP Python runtime requirements")
        runtime_result = install_python_runtime(dry_run=dry_run)
        if runtime_result != 0:
            failures.append("python runtime")

    if not missing:
        print("All listed MCP tools are already installed.")
        return 0 if not failures else 1

    print(f"Installing {len(missing)} missing MCP tool(s)")
    print()
    for tool in missing:
        print(f"[{tool.category}] {tool.name}")
        result = install_tool(tool, state, dry_run=dry_run)
        if result != 0:
            failures.append(tool.name)
            print(f"    install failed: {tool.name}")
        elif dry_run:
            print(f"    dry-run planned: {tool.name}")
        elif has_command(tool.binary):
            print(f"    installed: {tool.name}")
        else:
            failures.append(tool.name)
            print(f"    install completed but binary not found in PATH: {tool.binary}")
        print()

    if failures:
        print("Some tools still need manual attention:")
        for name in failures:
            print(f"  - {name}")
        return 1

    print("All missing tools were installed.")
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="ReconVault local MCP Kali tool installer by RescueVault Team"
    )
    parser.add_argument("--install", action="store_true", help="install missing tools")
    parser.add_argument("--install-runtime", action="store_true", help="install Python runtime dependencies for the MCP server")
    parser.add_argument("--dry-run", action="store_true", help="show install commands without executing them")
    parser.add_argument("--ascii", action="store_true", help="use ASCII status marks")
    parser.add_argument("--manifest", default=str(MANIFEST), help="path to tool manifest")
    args = parser.parse_args(argv)

    manifest_path = Path(args.manifest)
    tools = parse_manifest(manifest_path)

    print_status(tools, ascii_only=args.ascii)

    if args.install:
        return install_missing(tools, dry_run=args.dry_run, include_runtime=args.install_runtime)

    if args.install_runtime:
        return install_python_runtime(dry_run=args.dry_run)

    print("Status-only mode. Add --install to install missing Kali tools.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
