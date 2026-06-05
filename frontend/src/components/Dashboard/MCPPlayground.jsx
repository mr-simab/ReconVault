import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { mcpAPI } from '../../services/api';
import GlassIcon from '../Common/GlassIcon';

const connectedTone = {
  dot: 'text-safe-green',
  border: 'border-safe-green/50 text-safe-green bg-safe-green/10',
  icon: 'green',
  label: 'Connected'
};

const disconnectedTone = {
  dot: 'text-danger-red',
  border: 'border-danger-red/50 text-danger-red bg-danger-red/10',
  icon: 'red',
  label: 'Not connected'
};

function statusFor(server) {
  return server?.configured && server?.baseUrl ? connectedTone : disconnectedTone;
}

function ServerRow({ server, isSelected, onSelect }) {
  const status = statusFor(server);
  const toolCount = Array.isArray(server.tools) ? server.tools.length : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rv-command-button w-full p-3 text-left transition-colors ${isSelected ? 'is-active' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <GlassIcon name="mcp" size="sm" tone={isSelected ? 'green' : status.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm text-neon-green">{server.name}</span>
            <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase ${status.border}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-cyber-gray">
            {server.baseUrl || 'No server endpoint configured'}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-neon-cyan">{toolCount}</div>
          <div className="text-[10px] uppercase text-cyber-gray">tools</div>
        </div>
      </div>
    </button>
  );
}

function ToolEntry({ tool }) {
  const inputCount = Array.isArray(tool.inputs) ? tool.inputs.length : 0;
  const outputCount = Array.isArray(tool.outputs) ? tool.outputs.length : 0;

  return (
    <div className="rounded border border-cyber-border bg-cyber-black/45 p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-neon-green">{tool.displayName || tool.name}</div>
          <div className="mt-1 truncate text-[11px] text-cyber-gray">{tool.name}</div>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase ${tool.requiresApproval ? 'border-warning-yellow/60 text-warning-yellow' : 'border-neon-cyan/50 text-neon-cyan'}`}>
          {tool.requiresApproval ? 'Approval' : 'Ready'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded border border-cyber-border bg-cyber-dark/60 px-2 py-1 text-cyber-gray">
          Inputs <span className="float-right text-neon-cyan">{inputCount}</span>
        </div>
        <div className="rounded border border-cyber-border bg-cyber-dark/60 px-2 py-1 text-cyber-gray">
          Outputs <span className="float-right text-neon-cyan">{outputCount}</span>
        </div>
      </div>
    </div>
  );
}

const MCPPlayground = () => {
  const [servers, setServers] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadServers = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await mcpAPI.listServers();
      const nextServers = Array.isArray(response.servers) ? response.servers : [];
      setServers(nextServers);
      setSelectedName((current) => {
        if (nextServers.some((server) => server.name === current)) return current;
        return nextServers[0]?.name || '';
      });
    } catch (error) {
      setMessage(error.message || 'MCP server list is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const summary = useMemo(() => {
    const connected = servers.filter((server) => server.configured && server.baseUrl).length;
    const totalTools = servers.reduce((count, server) => count + (Array.isArray(server.tools) ? server.tools.length : 0), 0);
    return {
      connected,
      disconnected: Math.max(servers.length - connected, 0),
      total: servers.length,
      totalTools
    };
  }, [servers]);

  const selectedServer = useMemo(
    () => servers.find((server) => server.name === selectedName) || servers[0] || null,
    [servers, selectedName]
  );

  const selectedStatus = statusFor(selectedServer);

  return (
    <div className="h-full min-h-0 overflow-y-auto scrollable-cyber bg-cyber-black/40">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyber-border pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-cyber text-neon-green">MCP Playground</h2>
            <p className="mt-1 max-w-3xl text-xs text-cyber-gray">
              Registered MCP sources, connection state, and tool inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={loadServers}
            disabled={loading}
            className="rv-command-button h-10 px-3 text-xs font-mono flex items-center gap-2 disabled:opacity-60"
          >
            <GlassIcon name="refresh" size="xs" tone="cyan" />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rv-panel-section p-3">
            <div className="text-[10px] uppercase text-cyber-gray">Total MCP</div>
            <div className="mt-2 text-2xl text-neon-green">{summary.total}</div>
          </div>
          <div className="rv-panel-section p-3">
            <div className="text-[10px] uppercase text-cyber-gray">Connected</div>
            <div className="mt-2 text-2xl text-safe-green">{summary.connected}</div>
          </div>
          <div className="rv-panel-section p-3">
            <div className="text-[10px] uppercase text-cyber-gray">Not Connected</div>
            <div className="mt-2 text-2xl text-danger-red">{summary.disconnected}</div>
          </div>
          <div className="rv-panel-section p-3">
            <div className="text-[10px] uppercase text-cyber-gray">Tools</div>
            <div className="mt-2 text-2xl text-neon-cyan">{summary.totalTools}</div>
          </div>
        </div>

        {message && (
          <div className="rounded border border-danger-red/60 bg-danger-red/10 px-3 py-2 text-xs text-danger-red">
            {message}
          </div>
        )}

        <div className="grid min-h-[520px] gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neon-green">MCP Sources</h3>
              <span className="shrink-0 text-[11px] text-cyber-gray">{summary.connected}/{summary.total} connected</span>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-y-auto scrollable-cyber pr-1">
              {loading && servers.length === 0 ? (
                <div className="py-12 text-center text-sm text-cyber-gray">Loading MCP sources...</div>
              ) : servers.length === 0 ? (
                <div className="py-12 text-center text-sm text-cyber-gray">No MCP sources registered.</div>
              ) : servers.map((server) => (
                <ServerRow
                  key={server.name}
                  server={server}
                  isSelected={selectedServer?.name === server.name}
                  onSelect={() => setSelectedName(server.name)}
                />
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
            {!selectedServer ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-cyber-gray">
                Select an MCP source to inspect.
              </div>
            ) : (
              <motion.div
                key={selectedServer.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full min-h-0 flex-col"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyber-border pb-4">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <GlassIcon name="mcp" size="md" tone={selectedStatus.icon} />
                      <h3 className="truncate text-lg font-cyber text-neon-green">{selectedServer.name}</h3>
                    </div>
                    <div className="mt-2 break-all text-xs text-cyber-gray">
                      {selectedServer.baseUrl || 'No server endpoint configured'}
                    </div>
                  </div>
                  <span className={`rounded border px-3 py-1 text-xs uppercase ${selectedStatus.border}`}>
                    {selectedStatus.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rv-panel-section p-3">
                    <div className="text-[10px] uppercase text-cyber-gray">Source Name</div>
                    <div className="mt-2 truncate text-sm text-neon-green">{selectedServer.name}</div>
                  </div>
                  <div className="rv-panel-section p-3">
                    <div className="text-[10px] uppercase text-cyber-gray">Connection</div>
                    <div className={`mt-2 flex items-center gap-2 text-sm ${selectedStatus.dot}`}>
                      <span className={`rv-status-dot ${selectedStatus.dot}`} />
                      {selectedStatus.label}
                    </div>
                  </div>
                  <div className="rv-panel-section p-3">
                    <div className="text-[10px] uppercase text-cyber-gray">Registered Tools</div>
                    <div className="mt-2 text-sm text-neon-cyan">{selectedServer.tools?.length || 0}</div>
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-neon-green">Tool Inventory</h4>
                    <span className="shrink-0 text-[11px] text-cyber-gray">
                      {selectedServer.tools?.length || 0} tools
                    </span>
                  </div>
                  <div className="grid max-h-[430px] gap-3 overflow-y-auto scrollable-cyber pr-1 lg:grid-cols-2">
                    {(selectedServer.tools || []).length === 0 ? (
                      <div className="rounded border border-cyber-border p-6 text-center text-sm text-cyber-gray">
                        No tools registered for this MCP source.
                      </div>
                    ) : selectedServer.tools.map((tool) => (
                      <ToolEntry key={`${selectedServer.name}-${tool.name}`} tool={tool} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MCPPlayground;
