# Local MCP Server

Maintained by the RescueVault Team

This directory contains the Kali/Linux-side MCP server used by ReconVault for local tool execution.

- [MCP_SETUP.md](MCP_SETUP.md): Windows backend + Kali MCP setup guide.
- [reconvault_local_mcp_server.py](reconvault_local_mcp_server.py): local HTTP MCP adapter.
- [rvault-tool-install.py](rvault-tool-install.py): Kali tool status and host-native installer utility.
- [requirements.txt](requirements.txt): MCP tool manifest grouped into five categories.
- [server-requirements.txt](server-requirements.txt): Python packages for the MCP adapter.

The installer also supports an optional ReconVault Privacy Proxy setup for Tor + ProxyChains4. When the proxy is active, the local MCP server can route tool execution through `proxychains4` according to `RECONVAULT_MCP_PROXY_MODE`.

The backend MCP URL configuration is not duplicated here. Use [mcp.servers.example.json](../backend/config/mcp.servers.example.json) as the tracked MCP server URL example.
