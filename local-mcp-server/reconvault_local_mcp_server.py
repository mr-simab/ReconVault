#!/usr/bin/env python3
"""
ReconVault local MCP HTTP adapter.

This server matches ReconVault's current MCP gateway contract:

POST /mcp/tools/<source>/<tool>
{
  "tool": "subfinder",
  "input": {"target": "example.com"},
  "metadata": {"source": "Recon MCP"}
}

It intentionally uses structured allowlisted command builders instead of raw
shell strings. Set RECONVAULT_MCP_DRY_RUN=false to execute installed tools.
High-intensity tools additionally require RECONVAULT_MCP_ALLOW_HIGH_INTENSITY=true.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from typing import Any, Callable, Dict, List, Tuple
from urllib.parse import urlparse

from flask import Flask, jsonify, request


CommandBuilder = Callable[[Dict[str, Any]], List[str]]


DEFAULT_WORDLIST = os.environ.get(
    "RECONVAULT_MCP_WORDLIST",
    "/usr/share/wordlists/dirb/common.txt",
)
DRY_RUN = os.environ.get("RECONVAULT_MCP_DRY_RUN", "true").lower() != "false"
ALLOW_HIGH_INTENSITY = os.environ.get("RECONVAULT_MCP_ALLOW_HIGH_INTENSITY", "false").lower() == "true"
MAX_OUTPUT_BYTES = int(os.environ.get("RECONVAULT_MCP_MAX_OUTPUT_BYTES", "200000"))
DEFAULT_TIMEOUT_SECONDS = int(os.environ.get("RECONVAULT_MCP_TIMEOUT_SECONDS", "180"))


def as_text(value: Any, default: str = "") -> str:
    return str(value if value is not None else default).strip()


def first_value(input_data: Dict[str, Any], *keys: str, default: str = "") -> str:
    for key in keys:
        value = as_text(input_data.get(key))
        if value:
            return value
    return default


def target(input_data: Dict[str, Any]) -> str:
    return first_value(input_data, "target", "domain", "url", "ip", "email", "username", "path", "image")


def domain(input_data: Dict[str, Any]) -> str:
    value = first_value(input_data, "domain", "target", "url")
    if value.startswith("http://") or value.startswith("https://"):
        return urlparse(value).hostname or value
    if "@" in value:
        return value.split("@", 1)[1]
    return value


def url(input_data: Dict[str, Any]) -> str:
    value = first_value(input_data, "url", "target", "domain")
    if value and not value.startswith(("http://", "https://")):
        return f"https://{value}"
    return value


def ip_or_host(input_data: Dict[str, Any]) -> str:
    return first_value(input_data, "ip", "host", "target", "domain")


def username(input_data: Dict[str, Any]) -> str:
    value = first_value(input_data, "username", "target", "email")
    if "@" in value:
        return value.split("@", 1)[0]
    return value


def email(input_data: Dict[str, Any]) -> str:
    return first_value(input_data, "email", "target")


def wordlist(input_data: Dict[str, Any]) -> str:
    return first_value(input_data, "wordlist", default=DEFAULT_WORDLIST)


def path_target(input_data: Dict[str, Any]) -> str:
    return first_value(input_data, "path", "repository", "image", "target", default=".")


def require_value(value: str, label: str) -> str:
    if not value:
        raise ValueError(f"{label} is required")
    return value


def recon_amass(input_data: Dict[str, Any]) -> List[str]:
    return ["amass", "enum", "-passive", "-d", require_value(domain(input_data), "domain")]


def recon_subfinder(input_data: Dict[str, Any]) -> List[str]:
    return ["subfinder", "-d", require_value(domain(input_data), "domain"), "-silent"]


def recon_httpx(input_data: Dict[str, Any]) -> List[str]:
    return ["httpx", "-u", require_value(url(input_data), "url"), "-silent", "-tech-detect", "-status-code", "-title"]


def recon_katana(input_data: Dict[str, Any]) -> List[str]:
    depth = as_text(input_data.get("depth"), "1")
    return ["katana", "-u", require_value(url(input_data), "url"), "-d", depth, "-silent"]


def recon_waymore(input_data: Dict[str, Any]) -> List[str]:
    return ["waymore", "-i", require_value(domain(input_data), "domain"), "-mode", "U"]


def recon_gau(input_data: Dict[str, Any]) -> List[str]:
    return ["gau", require_value(domain(input_data), "domain")]


def recon_waybackurls(input_data: Dict[str, Any]) -> List[str]:
    return ["waybackurls", require_value(domain(input_data), "domain")]


def recon_hakrawler(input_data: Dict[str, Any]) -> List[str]:
    return ["hakrawler", "-url", require_value(url(input_data), "url")]


def recon_dnsrecon(input_data: Dict[str, Any]) -> List[str]:
    return ["dnsrecon", "-d", require_value(domain(input_data), "domain")]


def recon_fierce(input_data: Dict[str, Any]) -> List[str]:
    return ["fierce", "--domain", require_value(domain(input_data), "domain")]


def recon_dnsenum(input_data: Dict[str, Any]) -> List[str]:
    return ["dnsenum", require_value(domain(input_data), "domain")]


def recon_assetfinder(input_data: Dict[str, Any]) -> List[str]:
    return ["assetfinder", "--subs-only", require_value(domain(input_data), "domain")]


def network_nmap(input_data: Dict[str, Any]) -> List[str]:
    ports = first_value(input_data, "ports", default="--top-ports")
    if ports == "--top-ports":
        return ["nmap", "-sV", "--top-ports", "1000", require_value(ip_or_host(input_data), "target")]
    return ["nmap", "-sV", "-p", ports, require_value(ip_or_host(input_data), "target")]


def network_naabu(input_data: Dict[str, Any]) -> List[str]:
    return ["naabu", "-host", require_value(ip_or_host(input_data), "target"), "-top-ports", "1000", "-silent"]


def network_dnsx(input_data: Dict[str, Any]) -> List[str]:
    return ["dnsx", "-d", require_value(domain(input_data), "domain"), "-a", "-aaaa", "-cname", "-mx", "-txt", "-silent"]


def network_masscan(input_data: Dict[str, Any]) -> List[str]:
    ports = first_value(input_data, "ports", default="1-1000")
    rate = first_value(input_data, "rate", default="1000")
    return ["masscan", require_value(ip_or_host(input_data), "target"), "-p", ports, "--rate", rate]


def network_rustscan(input_data: Dict[str, Any]) -> List[str]:
    return ["rustscan", "-a", require_value(ip_or_host(input_data), "target"), "--ulimit", "5000"]


def network_autorecon(input_data: Dict[str, Any]) -> List[str]:
    return ["autorecon", require_value(ip_or_host(input_data), "target")]


def network_enum4linux(input_data: Dict[str, Any]) -> List[str]:
    return ["enum4linux-ng", "-A", require_value(ip_or_host(input_data), "target")]


def network_sslscan(input_data: Dict[str, Any]) -> List[str]:
    return ["sslscan", require_value(first_value(input_data, "target", "domain", "ip", "url"), "target")]


def web_nuclei(input_data: Dict[str, Any]) -> List[str]:
    severity = first_value(input_data, "severity", default="info,low,medium")
    return ["nuclei", "-u", require_value(url(input_data), "url"), "-severity", severity, "-jsonl"]


def web_whatweb(input_data: Dict[str, Any]) -> List[str]:
    return ["whatweb", require_value(url(input_data), "url"), "--color=never"]


def web_wafw00f(input_data: Dict[str, Any]) -> List[str]:
    return ["wafw00f", require_value(url(input_data), "url")]


def web_nikto(input_data: Dict[str, Any]) -> List[str]:
    return ["nikto", "-h", require_value(url(input_data), "url"), "-nointeractive"]


def web_gobuster(input_data: Dict[str, Any]) -> List[str]:
    return ["gobuster", "dir", "-u", require_value(url(input_data), "url"), "-w", wordlist(input_data), "-q"]


def web_ffuf(input_data: Dict[str, Any]) -> List[str]:
    fuzz_url = require_value(url(input_data), "url").rstrip("/") + "/FUZZ"
    return ["ffuf", "-u", fuzz_url, "-w", wordlist(input_data), "-mc", "200,204,301,302,307,401,403"]


def web_feroxbuster(input_data: Dict[str, Any]) -> List[str]:
    return ["feroxbuster", "-u", require_value(url(input_data), "url"), "-w", wordlist(input_data), "--json"]


def web_dirsearch(input_data: Dict[str, Any]) -> List[str]:
    return ["dirsearch", "-u", require_value(url(input_data), "url"), "-w", wordlist(input_data), "--format", "json"]


def web_arjun(input_data: Dict[str, Any]) -> List[str]:
    return ["arjun", "-u", require_value(url(input_data), "url"), "--stable", "-oJ", "-"]


def web_paramspider(input_data: Dict[str, Any]) -> List[str]:
    return ["paramspider", "-d", require_value(domain(input_data), "domain")]


def web_wpscan(input_data: Dict[str, Any]) -> List[str]:
    return ["wpscan", "--url", require_value(url(input_data), "url"), "--format", "json", "--random-user-agent"]


def web_dalfox(input_data: Dict[str, Any]) -> List[str]:
    return ["dalfox", "url", require_value(url(input_data), "url"), "--silence", "--no-spinner"]


def web_jaeles(input_data: Dict[str, Any]) -> List[str]:
    return ["jaeles", "scan", "-u", require_value(url(input_data), "url")]


def web_zap_baseline(input_data: Dict[str, Any]) -> List[str]:
    return ["zap-baseline.py", "-t", require_value(url(input_data), "url"), "-J", "-"]


def osint_sherlock(input_data: Dict[str, Any]) -> List[str]:
    return ["sherlock", require_value(username(input_data), "username"), "--print-found", "--no-color"]


def osint_holehe(input_data: Dict[str, Any]) -> List[str]:
    return ["holehe", require_value(email(input_data), "email"), "--no-color"]


def osint_theharvester(input_data: Dict[str, Any]) -> List[str]:
    return ["theHarvester", "-d", require_value(domain(input_data), "domain"), "-b", "all"]


def osint_phoneinfoga(input_data: Dict[str, Any]) -> List[str]:
    return ["phoneinfoga", "scan", "-n", require_value(first_value(input_data, "phone", "target"), "phone")]


def osint_exiftool(input_data: Dict[str, Any]) -> List[str]:
    return ["exiftool", require_value(target(input_data), "file/url target")]


def osint_spiderfoot(input_data: Dict[str, Any]) -> List[str]:
    return ["sf.py", "-s", require_value(target(input_data), "target"), "-m", "all", "-q"]


def osint_recon_ng(input_data: Dict[str, Any]) -> List[str]:
    workspace = first_value(input_data, "workspace", default="reconvault")
    return ["recon-ng", "-w", workspace, "-C", f"add domains {require_value(domain(input_data), 'domain')}; show domains"]


def osint_social_analyzer(input_data: Dict[str, Any]) -> List[str]:
    return ["social-analyzer", "--username", require_value(username(input_data), "username"), "--metadata"]


def osint_shodan_cli(input_data: Dict[str, Any]) -> List[str]:
    return ["shodan", "host", require_value(ip_or_host(input_data), "target")]


def osint_censys_cli(input_data: Dict[str, Any]) -> List[str]:
    return ["censys", "search", require_value(ip_or_host(input_data), "target")]


def cloud_trivy(input_data: Dict[str, Any]) -> List[str]:
    scan_type = first_value(input_data, "scan_type", "scanType", default="fs")
    return ["trivy", scan_type, "--format", "json", require_value(path_target(input_data), "path/image")]


def cloud_checkov(input_data: Dict[str, Any]) -> List[str]:
    return ["checkov", "-d", require_value(path_target(input_data), "path"), "-o", "json"]


def cloud_terrascan(input_data: Dict[str, Any]) -> List[str]:
    return ["terrascan", "scan", "-i", "all", "-d", require_value(path_target(input_data), "path"), "-o", "json"]


def cloud_prowler(input_data: Dict[str, Any]) -> List[str]:
    provider = first_value(input_data, "provider", default="aws")
    profile = first_value(input_data, "profile")
    command = ["prowler", provider, "-M", "json"]
    if profile:
        command.extend(["--profile", profile])
    return command


def cloud_kube_bench(_input_data: Dict[str, Any]) -> List[str]:
    return ["kube-bench", "--json"]


def cloud_kube_hunter(input_data: Dict[str, Any]) -> List[str]:
    tgt = first_value(input_data, "cluster", "target", "ip", "domain")
    command = ["kube-hunter", "--report", "json"]
    if tgt:
        command.extend(["--remote", tgt])
    return command


TOOL_BUILDERS: Dict[str, Tuple[str, CommandBuilder, bool]] = {
    "amass": ("recon", recon_amass, False),
    "subfinder": ("recon", recon_subfinder, False),
    "httpx": ("recon", recon_httpx, False),
    "katana": ("recon", recon_katana, False),
    "waymore": ("recon", recon_waymore, False),
    "gau": ("recon", recon_gau, False),
    "waybackurls": ("recon", recon_waybackurls, False),
    "hakrawler": ("recon", recon_hakrawler, False),
    "dnsrecon": ("recon", recon_dnsrecon, False),
    "fierce": ("recon", recon_fierce, False),
    "dnsenum": ("recon", recon_dnsenum, False),
    "assetfinder": ("recon", recon_assetfinder, False),
    "nmap": ("network", network_nmap, True),
    "naabu": ("network", network_naabu, True),
    "dnsx": ("network", network_dnsx, False),
    "masscan": ("network", network_masscan, True),
    "rustscan": ("network", network_rustscan, True),
    "autorecon": ("network", network_autorecon, True),
    "enum4linux_ng": ("network", network_enum4linux, True),
    "sslscan": ("network", network_sslscan, False),
    "nuclei": ("web", web_nuclei, False),
    "whatweb": ("web", web_whatweb, False),
    "wafw00f": ("web", web_wafw00f, False),
    "nikto": ("web", web_nikto, True),
    "gobuster": ("web", web_gobuster, True),
    "ffuf": ("web", web_ffuf, True),
    "feroxbuster": ("web", web_feroxbuster, True),
    "dirsearch": ("web", web_dirsearch, True),
    "arjun": ("web", web_arjun, False),
    "paramspider": ("web", web_paramspider, False),
    "wpscan": ("web", web_wpscan, True),
    "dalfox": ("web", web_dalfox, True),
    "jaeles": ("web", web_jaeles, True),
    "zap_baseline": ("web", web_zap_baseline, True),
    "sherlock": ("osint", osint_sherlock, False),
    "holehe": ("osint", osint_holehe, False),
    "theharvester": ("osint", osint_theharvester, False),
    "phoneinfoga": ("osint", osint_phoneinfoga, False),
    "exiftool": ("osint", osint_exiftool, False),
    "spiderfoot": ("osint", osint_spiderfoot, False),
    "recon_ng": ("osint", osint_recon_ng, False),
    "social_analyzer": ("osint", osint_social_analyzer, False),
    "shodan_cli": ("osint", osint_shodan_cli, False),
    "censys_cli": ("osint", osint_censys_cli, False),
    "trivy": ("cloud", cloud_trivy, False),
    "checkov": ("cloud", cloud_checkov, False),
    "terrascan": ("cloud", cloud_terrascan, False),
    "prowler": ("cloud", cloud_prowler, True),
    "kube_bench": ("cloud", cloud_kube_bench, False),
    "kube_hunter": ("cloud", cloud_kube_hunter, True),
}


def truncate_output(value: str) -> str:
    encoded = value.encode("utf-8", errors="replace")
    if len(encoded) <= MAX_OUTPUT_BYTES:
        return value
    return encoded[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace") + "\n[truncated]"


def run_tool(source: str, tool: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
    normalized_tool = tool.strip().lower().replace("-", "_")
    if normalized_tool not in TOOL_BUILDERS:
        return {
            "status": "unavailable",
            "tool": tool,
            "source": source,
            "reason": "Tool is not registered in this local MCP adapter.",
        }

    expected_source, builder, high_intensity = TOOL_BUILDERS[normalized_tool]
    if source and source != expected_source:
        return {
            "status": "unavailable",
            "tool": tool,
            "source": source,
            "reason": f"Tool belongs to {expected_source} MCP, not {source} MCP.",
        }

    try:
        command = builder(input_data)
    except ValueError as error:
        return {"status": "failed", "tool": tool, "source": source, "reason": str(error)}

    if DRY_RUN:
        return {
            "status": "planned",
            "tool": tool,
            "source": source,
            "dryRun": True,
            "command": command,
            "highIntensity": high_intensity,
        }

    if high_intensity and not ALLOW_HIGH_INTENSITY:
        return {
            "status": "blocked",
            "tool": tool,
            "source": source,
            "reason": "High-intensity execution is disabled. Set RECONVAULT_MCP_ALLOW_HIGH_INTENSITY=true for authorized scopes.",
            "command": command,
        }

    executable = shutil.which(command[0])
    if not executable:
        return {
            "status": "unavailable",
            "tool": tool,
            "source": source,
            "reason": f"{command[0]} is not installed or not in PATH.",
            "command": command,
        }

    command[0] = executable
    started = time.time()
    timeout = int(input_data.get("timeoutSeconds") or DEFAULT_TIMEOUT_SECONDS)
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return {
            "status": "completed" if result.returncode == 0 else "failed",
            "tool": tool,
            "source": source,
            "command": command,
            "returnCode": result.returncode,
            "durationSeconds": round(time.time() - started, 3),
            "stdout": truncate_output(result.stdout or ""),
            "stderr": truncate_output(result.stderr or ""),
        }
    except subprocess.TimeoutExpired as error:
        return {
            "status": "failed",
            "tool": tool,
            "source": source,
            "reason": f"Tool timed out after {timeout} seconds.",
            "stdout": truncate_output(error.stdout or ""),
            "stderr": truncate_output(error.stderr or ""),
        }


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health() -> Any:
        return jsonify(
            {
                "status": "ok",
                "dryRun": DRY_RUN,
                "allowHighIntensity": ALLOW_HIGH_INTENSITY,
                "tools": len(TOOL_BUILDERS),
            }
        )

    @app.get("/tools")
    def tools() -> Any:
        return jsonify(
            {
                "tools": [
                    {"name": name, "source": source, "highIntensity": high}
                    for name, (source, _builder, high) in sorted(TOOL_BUILDERS.items())
                ]
            }
        )

    @app.post("/mcp/tools/<source>/<tool>")
    def execute(source: str, tool: str) -> Any:
        payload = request.get_json(silent=True) or {}
        input_data = payload.get("input") if isinstance(payload.get("input"), dict) else payload
        requested_tool = as_text(payload.get("tool"), tool)
        return jsonify(run_tool(source, requested_tool, input_data))

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="ReconVault local MCP HTTP adapter")
    parser.add_argument("--host", default=os.environ.get("RECONVAULT_MCP_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("RECONVAULT_MCP_PORT", "9101")))
    args = parser.parse_args()
    create_app().run(host=args.host, port=args.port)


if __name__ == "__main__":
    main()
