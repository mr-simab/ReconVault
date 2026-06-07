#!/usr/bin/env python3
"""
RescueVault Team - ReconVault local MCP tool installer for Kali Linux.

Default mode displays installation status only.
Use --install to install missing tools.
"""

from __future__ import annotations

import argparse
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional


BRAND = "RescueVault Team"
MANIFEST = Path(__file__).with_name("requirements.txt")
PYTHON_REQUIREMENTS = Path(__file__).with_name("server-requirements.txt")
EXPECTED_CATEGORIES = ["Recon MCP", "Network MCP", "Web MCP", "OSINT MCP", "Cloud MCP"]
PRIVACY_PROXY_NAME = "ReconVault Privacy Proxy"
TOR_SERVICE = "tor@default"
TOR_SOCKS_HOST = "127.0.0.1"
TOR_SOCKS_PORT = "9050"
PROXYCHAINS_CONFIG = Path("/etc/proxychains4.conf")
BLUE = "\033[94m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"


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


def colorize(value: str, color: str, enabled: bool = True) -> str:
    if not enabled or os.environ.get("NO_COLOR"):
        return value
    return f"{color}{value}{RESET}"


def display_path(path: Path) -> str:
    text = str(path)
    home = str(Path.home())
    if home and text.startswith(home):
        suffix = text[len(home):].replace("\\", "/")
        return f"$HOME{suffix}"
    return text.replace("\\", "/")


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
        parts = [part.strip() for part in line.split("|", 3)]
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
    return "INSTALLED" if installed else "NOT FOUND"


def print_status(tools: List[ToolSpec], ascii_only: bool = False, color: bool = True) -> None:
    grouped = group_by_category(tools)
    installed_count = sum(1 for tool in tools if has_command(tool.binary))
    total_count = len(tools)

    print()
    print("ReconVault Local MCP Tool Status")
    print(f"Maintained by {BRAND}")
    print(f"Installed: {installed_count}/{total_count}")
    print()

    for category in EXPECTED_CATEGORIES:
        category_tools = grouped.get(category, [])
        category_installed = sum(1 for tool in category_tools if has_command(tool.binary))
        print(f"{category} ({category_installed}/{len(category_tools)})")
        for tool in category_tools:
            installed = has_command(tool.binary)
            mark = status_symbol(installed, ascii_only)
            line = f"  {tool.name:<28} {mark:<10} {tool.binary}"
            print(colorize(line, BLUE if installed else RED, color))
        print()


def command_stdout(command: List[str], timeout: int = 5) -> str:
    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ""
    return (result.stdout or "").strip()


def is_service_active(service_name: str) -> bool:
    return command_stdout(["systemctl", "is-active", service_name]) == "active"


def is_service_enabled(service_name: str) -> str:
    return command_stdout(["systemctl", "is-enabled", service_name]) or "unknown"


def is_tor_socks_listening() -> bool:
    output = command_stdout(["ss", "-tulpn"])
    return f"{TOR_SOCKS_HOST}:{TOR_SOCKS_PORT}" in output or f"{TOR_SOCKS_HOST}.{TOR_SOCKS_PORT}" in output


def proxychains_configured() -> bool:
    try:
        config = PROXYCHAINS_CONFIG.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    required = [
        "dynamic_chain",
        "proxy_dns",
        f"socks5 {TOR_SOCKS_HOST} {TOR_SOCKS_PORT}",
    ]
    return all(item in config for item in required)


def print_privacy_proxy_status(color: bool = True) -> None:
    tor_installed = has_command("tor")
    proxychains_installed = has_command("proxychains4")
    tor_active = is_service_active(TOR_SERVICE)
    socks_ready = is_tor_socks_listening()
    enabled_state = is_service_enabled(TOR_SERVICE)
    config_ready = proxychains_configured()

    print(f"{PRIVACY_PROXY_NAME} Status")
    rows = [
        ("Tor package", tor_installed),
        ("ProxyChains4 package", proxychains_installed),
        (f"{TOR_SERVICE} active", tor_active),
        (f"SOCKS {TOR_SOCKS_HOST}:{TOR_SOCKS_PORT}", socks_ready),
        ("ProxyChains config", config_ready),
    ]
    for label, ok in rows:
        state = "READY" if ok else "NOT READY"
        print(colorize(f"  {label:<28} {state}", BLUE if ok else RED, color))
    print(f"  Boot state                  {enabled_state}")
    print()


def set_proxychains_directive(lines: List[str], directive: str, enabled: bool) -> List[str]:
    updated: List[str] = []
    found = False
    for line in lines:
        stripped = line.strip()
        normalized = stripped.lstrip("#").strip()
        if normalized == directive:
            if not found:
                updated.append(directive if enabled else f"#{directive}")
                found = True
            else:
                updated.append(f"#{directive}")
        else:
            updated.append(line)
    if enabled and not found:
        updated.insert(0, directive)
    return updated


def configure_proxychains(dry_run: bool) -> int:
    if dry_run:
        print(f"    -> configure {display_path(PROXYCHAINS_CONFIG)}")
        print("    -> enable dynamic_chain and proxy_dns")
        print(f"    -> set socks5 {TOR_SOCKS_HOST} {TOR_SOCKS_PORT}")
        return 0

    try:
        original = PROXYCHAINS_CONFIG.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        original = "[ProxyList]\n"

    lines = original.splitlines()
    lines = set_proxychains_directive(lines, "strict_chain", enabled=False)
    lines = set_proxychains_directive(lines, "dynamic_chain", enabled=True)
    lines = set_proxychains_directive(lines, "proxy_dns", enabled=True)

    proxy_line = f"socks5 {TOR_SOCKS_HOST} {TOR_SOCKS_PORT}"
    if "[ProxyList]" not in "\n".join(lines):
        lines.append("")
        lines.append("[ProxyList]")
    if proxy_line not in "\n".join(lines):
        lines.append(proxy_line)

    content = "\n".join(lines).rstrip() + "\n"
    if os.access(PROXYCHAINS_CONFIG.parent, os.W_OK):
        PROXYCHAINS_CONFIG.write_text(content, encoding="utf-8")
        return 0

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name
    try:
        return run_command(sudo_prefix() + ["cp", temp_path, str(PROXYCHAINS_CONFIG)], dry_run=False)
    finally:
        try:
            Path(temp_path).unlink()
        except OSError:
            pass


def install_privacy_proxy(dry_run: bool = False, start_on_boot: bool = True) -> int:
    state: Dict[str, bool] = {}
    print(f"Installing {PRIVACY_PROXY_NAME} (Tor + ProxyChains4)")
    ensure_apt_updated(state, dry_run)
    result = run_command(sudo_prefix() + ["apt-get", "install", "-y", "tor", "proxychains4"], dry_run=dry_run)
    if result != 0:
        return result

    config_result = configure_proxychains(dry_run)
    if config_result != 0:
        return config_result

    if has_command("systemctl") or dry_run:
        run_command(sudo_prefix() + ["systemctl", "daemon-reload"], dry_run=dry_run)
        if start_on_boot:
            run_command(sudo_prefix() + ["systemctl", "enable", TOR_SERVICE], dry_run=dry_run)
        run_command(sudo_prefix() + ["systemctl", "start", TOR_SERVICE], dry_run=dry_run)
    else:
        print("  systemctl is unavailable; start Tor manually on this system.")

    print()
    print("Verification commands:")
    print(f"  systemctl is-active {TOR_SERVICE}")
    print(f"  curl --socks5-hostname {TOR_SOCKS_HOST}:{TOR_SOCKS_PORT} https://check.torproject.org/api/ip")
    print(f"  proxychains4 curl https://check.torproject.org/api/ip")
    print()
    return 0


def ask_yes_no(question: str) -> bool:
    answer = input(f"{question} [y/N]: ").strip().lower()
    return answer in {"y", "yes"}


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


def install_to_usr_local(source: Path, binary: str, dry_run: bool) -> int:
    destination = Path("/usr/local/bin") / binary
    if dry_run:
        print(f"    -> install -m 0755 {display_path(source)} {display_path(destination)}")
        return 0
    if not source.exists():
        return 1
    if os.access(destination.parent, os.W_OK):
        shutil.copy2(source, destination)
        destination.chmod(destination.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        return 0
    command = sudo_prefix() + ["install", "-m", "0755", str(source), str(destination)]
    return run_command(command, dry_run=False)


def ensure_binary_on_path(binary: str, candidates: Iterable[Path], dry_run: bool) -> int:
    if has_command(binary):
        return 0
    for candidate in candidates:
        if dry_run:
            print(f"    -> if {display_path(candidate)} exists, expose it as /usr/local/bin/{binary}")
            continue
        if candidate.exists():
            return install_to_usr_local(candidate, binary, dry_run=False)
    return 0 if dry_run else 1


def ensure_pipx(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("pipx"):
        return
    if state.get("pipx_attempted"):
        return
    print("  pipx was not detected; installing python3-pipx first.")
    install_apt("python3-pipx", state, dry_run)
    state["pipx_attempted"] = True


def install_pipx(tool: ToolSpec, package: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_pipx(state, dry_run)
    if not dry_run and not has_command("pipx"):
        return 127
    command = ["pipx", "install", package]
    result = run_command(command, dry_run=dry_run)
    if result != 0:
        command = ["pipx", "upgrade", package]
        result = run_command(command, dry_run=dry_run)
    if result == 0:
        ensure_binary_on_path(tool.binary, [Path.home() / ".local" / "bin" / tool.binary], dry_run)
    return result


def ensure_go(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("go"):
        return
    if state.get("go_attempted"):
        return
    print("  Go was not detected; installing golang-go first.")
    install_apt("golang-go", state, dry_run)
    state["go_attempted"] = True


def install_go(tool: ToolSpec, module: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_go(state, dry_run)
    if not dry_run and not has_command("go"):
        return 127
    result = run_command(["go", "install", module], dry_run=dry_run)
    if result == 0:
        ensure_binary_on_path(tool.binary, [Path.home() / "go" / "bin" / tool.binary], dry_run)
    return result


def ensure_cargo(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("cargo"):
        return
    if state.get("cargo_attempted"):
        return
    print("  Cargo was not detected; installing cargo first.")
    install_apt("cargo", state, dry_run)
    state["cargo_attempted"] = True


def install_cargo(tool: ToolSpec, crate: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_cargo(state, dry_run)
    if not dry_run and not has_command("cargo"):
        return 127
    result = run_command(["cargo", "install", crate], dry_run=dry_run)
    if result == 0:
        ensure_binary_on_path(tool.binary, [Path.home() / ".cargo" / "bin" / tool.binary], dry_run)
    return result


def ensure_gem(state: Dict[str, bool], dry_run: bool) -> None:
    if has_command("gem"):
        return
    if state.get("gem_attempted"):
        return
    print("  RubyGems was not detected; installing ruby-full first.")
    install_apt("ruby-full", state, dry_run)
    state["gem_attempted"] = True


def install_gem(package: str, state: Dict[str, bool], dry_run: bool) -> int:
    ensure_gem(state, dry_run)
    if not dry_run and not has_command("gem"):
        return 127
    command = sudo_prefix() + ["gem", "install", package]
    return run_command(command, dry_run=dry_run)


def install_tar_binary(value: str, dry_run: bool) -> int:
    if "," not in value:
        print(f"  Invalid tarbin installer value: {value}")
        return 2

    url, binary = [part.strip() for part in value.split(",", 1)]
    if dry_run:
        print(f"    -> download {url}")
        print(f"    -> extract {binary}")
        print(f"    -> install {binary} to /usr/local/bin/{binary}")
        return 0

    try:
        with tempfile.TemporaryDirectory(prefix="rvault-tool-") as tmp:
            tmpdir = Path(tmp)
            archive_path = tmpdir / "release.tar.gz"
            urllib.request.urlretrieve(url, archive_path)

            extracted_binary = tmpdir / binary
            with tarfile.open(archive_path, "r:gz") as archive:
                member = next(
                    (
                        item
                        for item in archive.getmembers()
                        if item.isfile() and Path(item.name).name == binary
                    ),
                    None,
                )
                if member is None:
                    print(f"  Release archive did not contain {binary}")
                    return 1

                source = archive.extractfile(member)
                if source is None:
                    print(f"  Could not extract {binary}")
                    return 1

                with extracted_binary.open("wb") as target:
                    shutil.copyfileobj(source, target)

            extracted_binary.chmod(0o755)
            return install_to_usr_local(extracted_binary, binary, dry_run=False)
    except Exception as exc:
        print(f"  Release installation failed for {binary}: {exc}")
        return 1


def install_python_runtime(dry_run: bool = False) -> int:
    if not PYTHON_REQUIREMENTS.exists():
        return 0
    if not has_command("python3"):
        print("python3 was not detected; install python3 before starting the MCP server.")
        return 127
    command = ["python3", "-m", "pip", "install", "-r", str(PYTHON_REQUIREMENTS)]
    return run_command(command, dry_run=dry_run)


def run_post_install(tool: ToolSpec, dry_run: bool) -> None:
    if tool.binary == "jaeles":
        print("  Initializing Jaeles signatures")
        run_command(["jaeles", "config", "init"], dry_run=dry_run)
        run_command(["jaeles", "config", "update"], dry_run=dry_run)
    elif tool.binary == "zap-baseline.py":
        candidates = [
            Path("/usr/share/zaproxy/zap-baseline.py"),
            Path("/usr/share/zap/zap-baseline.py"),
        ]
        if not has_command(tool.binary):
            result = ensure_binary_on_path(tool.binary, candidates, dry_run)
            if result != 0:
                print("  ZAP package installation completed, but zap-baseline.py was not found in the expected paths.")


def install_with_spec(tool: ToolSpec, installer: str, state: Dict[str, bool], dry_run: bool) -> int:
    if ":" not in installer:
        print(f"  Unsupported installer format for {tool.name}: {installer}")
        return 2

    method, value = installer.split(":", 1)
    method = method.strip().lower()
    value = value.strip()

    if method == "apt":
        return install_apt(value, state, dry_run)
    if method == "pipx":
        return install_pipx(tool, value, state, dry_run)
    if method == "go":
        return install_go(tool, value, state, dry_run)
    if method == "cargo":
        return install_cargo(tool, value, state, dry_run)
    if method == "gem":
        return install_gem(value, state, dry_run)
    if method == "tarbin":
        return install_tar_binary(value, dry_run)
    if method == "docker":
        print(f"  Docker-based installation is not supported for {tool.name}; configure a host-native installer instead.")
        return 2

    print(f"  Unsupported installer method for {tool.name}: {method}")
    return 2


def install_tool(tool: ToolSpec, state: Dict[str, bool], dry_run: bool = False) -> int:
    installers = [installer.strip() for installer in tool.installer.split("||") if installer.strip()]
    if not installers:
        print(f"  No installer configured for {tool.name}")
        return 2

    last_result = 2
    for index, installer in enumerate(installers, start=1):
        if len(installers) > 1:
            print(f"  Installer {index}/{len(installers)}: {installer}")

        result = install_with_spec(tool, installer, state, dry_run)
        last_result = result

        if dry_run:
            run_post_install(tool, dry_run=True)
            continue

        if result == 0:
            run_post_install(tool, dry_run=False)
        if result == 0 and has_command(tool.binary):
            return 0
        if result == 0:
            print(f"  Installer completed, but {tool.binary} is not available on PATH.")
        else:
            print(f"  Installer returned an error for {tool.name}: {installer}")

    return 0 if dry_run else last_result


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
        print("All listed MCP tools are already available.")
        return 0 if not failures else 1

    print(f"Installing {len(missing)} missing MCP tool(s)")
    print()
    for tool in missing:
        print(f"[{tool.category}] {tool.name}")
        result = install_tool(tool, state, dry_run=dry_run)
        if result != 0:
            failures.append(tool.name)
            print(colorize(f"    installation failed: {tool.name}", RED))
        elif dry_run:
            print(colorize(f"    dry-run plan generated: {tool.name}", CYAN))
        elif has_command(tool.binary):
            print(colorize(f"    installation verified: {tool.name}", BLUE))
        else:
            failures.append(tool.name)
            print(colorize(f"    installation completed, but binary was not found on PATH: {tool.binary}", RED))
        print()

    if failures:
        print(colorize("Some tools require manual review:", RED))
        for name in failures:
            print(colorize(f"  - {name}", RED))
        return 1

    print(colorize("Tool installation completed successfully.", BLUE))
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="ReconVault local MCP Kali tool installer by RescueVault Team"
    )
    parser.add_argument("--install", action="store_true", help="install missing tools")
    parser.add_argument("--install-runtime", action="store_true", help="install Python runtime dependencies for the MCP server")
    parser.add_argument("--install-privacy-proxy", action="store_true", help="install and configure Tor + ProxyChains4")
    parser.add_argument("--skip-privacy-proxy-prompt", action="store_true", help="do not prompt for Tor + ProxyChains4 setup")
    parser.add_argument("--no-proxy-boot", action="store_true", help="do not enable Tor on boot when installing the privacy proxy")
    parser.add_argument("--dry-run", action="store_true", help="show install commands without executing them")
    parser.add_argument("--ascii", action="store_true", help="use ASCII status marks")
    parser.add_argument("--no-color", action="store_true", help="disable colored status output")
    parser.add_argument("--manifest", default=str(MANIFEST), help="path to tool manifest")
    args = parser.parse_args(argv)

    if args.no_color:
        os.environ["NO_COLOR"] = "1"

    manifest_path = Path(args.manifest)
    tools = parse_manifest(manifest_path)

    print_status(tools, ascii_only=args.ascii, color=not args.no_color)
    print_privacy_proxy_status(color=not args.no_color)

    proxy_result = 0
    proxy_requested = args.install_privacy_proxy
    if args.install_privacy_proxy:
        proxy_result = install_privacy_proxy(
            dry_run=args.dry_run,
            start_on_boot=not args.no_proxy_boot,
        )
    elif not args.skip_privacy_proxy_prompt and sys.stdin.isatty():
        if ask_yes_no(f"Install {PRIVACY_PROXY_NAME} for proxied recon traffic?"):
            proxy_requested = True
            proxy_result = install_privacy_proxy(
                dry_run=args.dry_run,
                start_on_boot=not args.no_proxy_boot,
            )

    if args.install:
        tool_result = install_missing(tools, dry_run=args.dry_run, include_runtime=args.install_runtime)
        return tool_result or proxy_result

    if args.install_runtime:
        runtime_result = install_python_runtime(dry_run=args.dry_run)
        return runtime_result or proxy_result

    if proxy_result != 0:
        return proxy_result
    if proxy_requested:
        return proxy_result

    print("Status-only mode. Use --install to install missing Kali tools.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
