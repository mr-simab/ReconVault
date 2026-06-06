# Local MCP Server

Maintained by the RescueVault Team

This directory contains the Kali/Linux-side MCP server used by ReconVault.

- [MCP_SETUP.md](MCP_SETUP.md): Windows backend + Kali MCP setup guide.
- [reconvault_local_mcp_server.py](reconvault_local_mcp_server.py): local HTTP MCP adapter.
- [rvault-tool-install.py](rvault-tool-install.py): Kali tool status and installer utility.
- [requirements.txt](requirements.txt): MCP tool manifest grouped into five categories.
- [server-requirements.txt](server-requirements.txt): Python packages for the MCP adapter.

The backend MCP URL config is not duplicated here. Use [mcp.servers.example.json](../backend/config/mcp.servers.example.json) as the only tracked MCP server URL example.
