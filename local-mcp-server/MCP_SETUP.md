# ReconVault Local MCP Server Setup

Maintained by the RescueVault Team

This folder is dedicated to the Linux/Kali-side local MCP server. The ReconVault backend can run on Windows while this MCP server runs on Kali Linux and exposes controlled tool endpoints over HTTP.

## Folder Contents

- `reconvault_local_mcp_server.py`: HTTP MCP adapter for ReconVault.
- `rvault-tool-install.py`: Kali tool status and installer utility.
- `requirements.txt`: Kali/Linux command-line tool manifest grouped by MCP source.
- `server-requirements.txt`: Python packages needed by the local MCP server.

The backend MCP URL configuration stays in:

```text
backend/config/mcp.servers.example.json
```

Copy that file to:

```text
backend/config/mcp.servers.json
```

Then replace each `baseUrl` with your Kali MCP server address, for example:

```json
"baseUrl": "http://192.168.56.110:9101"
```

## Architecture

```text
Windows host
  ReconVault backend
  backend/config/mcp.servers.json
        |
        | HTTP
        v
Kali Linux
  local-mcp-server/reconvault_local_mcp_server.py
  recon / network / web / osint / cloud tools
```

## 1. Configure Backend on Windows

In `backend/.env`:

```env
MCP_GATEWAY_CONFIG_FILE=config/mcp.servers.json
MCP_GATEWAY_SERVERS_JSON=
```

Copy the backend example config:

```powershell
Copy-Item backend\config\mcp.servers.example.json backend\config\mcp.servers.json
```

Edit `backend\config\mcp.servers.json` and set the Kali IP address:

```json
{
  "Recon MCP": {
    "baseUrl": "http://KALI_MCP_HOST:9101",
    "endpointTemplate": "/mcp/tools/recon/{tool}"
  }
}
```

Use the same `KALI_MCP_HOST:9101` for Network, Web, OSINT, and Cloud when using the single local MCP server provided here.

## 2. Prepare Kali Linux

On Kali:

```bash
cd local-mcp-server
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r server-requirements.txt
```

Check tool installation status:

```bash
python3 rvault-tool-install.py
```

Install and configure the optional ReconVault Privacy Proxy:

```bash
python3 rvault-tool-install.py --install-privacy-proxy
```

This installs `tor` and `proxychains4`, configures `/etc/proxychains4.conf` for `dynamic_chain`, `proxy_dns`, and `socks5 127.0.0.1 9050`, starts `tor@default`, and enables it on boot. Use `--dry-run` to review the planned commands before making changes.

Install missing tools:

```bash
python3 rvault-tool-install.py --install
```

The installer uses host-native Kali/Linux methods such as `apt`, `go install`, `cargo install`, `pipx`, Ruby gems, and release tarballs. Docker-based installation paths are not supported for this local MCP setup.

Preview install commands without changing the system:

```bash
python3 rvault-tool-install.py --install --dry-run
```

Install Python runtime packages through the installer:

```bash
python3 rvault-tool-install.py --install-runtime
```

## 3. Start the Kali MCP Server

Dry-run mode is enabled by default. The server returns planned commands without executing tools.

```bash
source .venv/bin/activate
python3 reconvault_local_mcp_server.py --host 0.0.0.0 --port 9101
```

From Windows, verify the Kali server:

```powershell
Invoke-WebRequest -UseBasicParsing http://KALI_MCP_HOST:9101/health
Invoke-WebRequest -UseBasicParsing http://KALI_MCP_HOST:9101/tools
```

## 4. Enable Live Tool Execution

On Kali:

```bash
export RECONVAULT_MCP_DRY_RUN=false
python3 reconvault_local_mcp_server.py --host 0.0.0.0 --port 9101
```

High-intensity tools require a second switch:

```bash
export RECONVAULT_MCP_DRY_RUN=false
export RECONVAULT_MCP_ALLOW_HIGH_INTENSITY=true
python3 reconvault_local_mcp_server.py --host 0.0.0.0 --port 9101
```

Useful runtime variables:

```bash
export RECONVAULT_MCP_WORDLIST=/usr/share/wordlists/dirb/common.txt
export RECONVAULT_MCP_MAX_OUTPUT_BYTES=200000
export RECONVAULT_MCP_TIMEOUT_SECONDS=180
export RECONVAULT_MCP_PROXY_MODE=auto
```

Proxy modes:

- `auto`: use `proxychains4` when Tor service or SOCKS `127.0.0.1:9050` is active.
- `always`: use `proxychains4` whenever the binary is available.
- `off`: run tools directly.

The MCP server reports proxy state in `/health` and includes proxy metadata in tool responses.

## 5. Tool Categories

The installer prints five MCP categories:

- Recon MCP
- Network MCP
- Web MCP
- OSINT MCP
- Cloud MCP

Each tool is shown with an installed or not-found status on the right side. Tools are installed only when you pass `--install`.

## 6. Backend Verification

After the Kali server is running and Windows backend config points to the Kali IP:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/mcp/servers
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/recon/matrix
```

Open the frontend, click the MCP status chip, and confirm the configured source counts.

## 7. Notes

- Keep `backend/config/mcp.servers.json` out of git if it contains private network URLs.
- The tracked config file is only `backend/config/mcp.servers.example.json`.
- The local MCP server is designed for Kali/Linux. Run it from Kali, not from the Windows backend process.
- The backend can still run on Windows because it only calls the Kali MCP server over HTTP.
