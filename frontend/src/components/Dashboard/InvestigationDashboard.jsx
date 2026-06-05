import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { aiPlanningAPI, investigationAPI, mcpAPI, toolsAPI, workflowAPI } from '../../services/api';

const statusClass = {
  COMPLETED: 'text-safe-green border-safe-green',
  RUNNING: 'text-neon-cyan border-neon-cyan',
  PLANNING: 'text-warning-yellow border-warning-yellow',
  FAILED: 'text-danger-red border-danger-red',
  unavailable: 'text-warning-yellow border-warning-yellow',
  skipped: 'text-warning-yellow border-warning-yellow',
  completed: 'text-safe-green border-safe-green',
  failed: 'text-danger-red border-danger-red'
};

function ToolPill({ tool }) {
  return (
    <span className="inline-flex max-w-full items-center rounded border border-cyber-border px-2 py-1 text-[11px] text-cyber-gray">
      <span className="truncate">{tool}</span>
    </span>
  );
}

function SectionHeader({ title, meta }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-neon-green">{title}</h3>
      {meta && <span className="shrink-0 text-[11px] text-cyber-gray">{meta}</span>}
    </div>
  );
}

const InvestigationDashboard = () => {
  const [target, setTarget] = useState('');
  const [request, setRequest] = useState('Perform reconnaissance and OSINT correlation');
  const [maxIterations, setMaxIterations] = useState(1);
  const [dryRun, setDryRun] = useState(true);
  const [approvedTools, setApprovedTools] = useState('');
  const [provider, setProvider] = useState(null);
  const [toolContext, setToolContext] = useState(null);
  const [mcpServers, setMcpServers] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [plans, setPlans] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const approvalOptions = useMemo(() => {
    const tools = toolContext?.all_tools || [];
    return tools.filter((tool) => tool.requiresApproval).map((tool) => tool.name).slice(0, 18);
  }, [toolContext]);

  const approvedToolList = useMemo(() => (
    approvedTools
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  ), [approvedTools]);

  const loadOverview = useCallback(async () => {
    const [providerResult, toolsResult, mcpResult] = await Promise.allSettled([
      aiPlanningAPI.getProviderStatus(),
      toolsAPI.getToolContext(),
      mcpAPI.listServers()
    ]);

    if (providerResult.status === 'fulfilled') setProvider(providerResult.value);
    if (toolsResult.status === 'fulfilled') setToolContext(toolsResult.value);
    if (mcpResult.status === 'fulfilled') setMcpServers(mcpResult.value.servers || []);

    try {
      const response = await investigationAPI.listInvestigations({ limit: 25 });
      setInvestigations(response.data || []);
    } catch (error) {
      setMessage('Investigation history needs Firebase. Planning still works without it.');
    }
  }, []);

  const loadInvestigationDetails = useCallback(async (investigation) => {
    if (!investigation) return;
    setSelectedInvestigation(investigation);
    const id = investigation.investigationId || investigation.id;
    const [planResult, evidenceResult, executionResult] = await Promise.allSettled([
      investigationAPI.listPlans(id),
      investigationAPI.listEvidence(id, 50),
      investigationAPI.listExecutions(id, 50)
    ]);
    setPlans(planResult.status === 'fulfilled' ? planResult.value.data || [] : []);
    setEvidence(evidenceResult.status === 'fulfilled' ? evidenceResult.value.data || [] : []);
    setExecutions(executionResult.status === 'fulfilled' ? executionResult.value.data || [] : []);
  }, []);

  useEffect(() => {
    loadOverview().catch((error) => setMessage(error.message));
  }, [loadOverview]);

  const handlePlanOnly = async () => {
    if (!target.trim()) {
      setMessage('Target is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await aiPlanningAPI.createPlan({
        target: target.trim(),
        user_request: request
      });
      setCurrentPlan(response.plan);
      setWorkflowResult(null);
      setAnalysis(null);
      setMessage(response.plan?.plannerMode === 'deterministic_fallback'
        ? 'Plan generated with deterministic fallback.'
        : 'Plan generated with configured provider.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvestigation = async () => {
    if (!target.trim()) {
      setMessage('Target is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const investigation = await investigationAPI.createInvestigation({
        target: target.trim(),
        user_request: request,
        goal: request
      });
      setInvestigations((prev) => [investigation, ...prev]);
      await loadInvestigationDetails(investigation);
      setMessage('Investigation created.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRunWorkflow = async () => {
    if (!target.trim()) {
      setMessage('Target is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await workflowAPI.runInvestigation({
        target: target.trim(),
        user_request: request,
        max_iterations: maxIterations,
        dry_run: dryRun,
        approved_tools: approvedToolList
      });
      setWorkflowResult(result);
      setCurrentPlan(result.iterations?.[0]?.plan || null);
      setAnalysis(result.iterations?.[result.iterations.length - 1]?.analysis || null);
      if (result.investigation) {
        setInvestigations((prev) => [result.investigation, ...prev.filter((item) => item.investigationId !== result.investigation.investigationId)]);
        await loadInvestigationDetails(result.investigation);
      }
      setMessage(dryRun ? 'Workflow validated in dry-run mode.' : 'Workflow execution completed.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    if (!selectedInvestigation) return;
    setBusy(true);
    setMessage('');
    try {
      const id = selectedInvestigation.investigationId || selectedInvestigation.id;
      const response = await investigationAPI.analyzeInvestigation(id, { objective: request });
      setAnalysis(response.report);
      setMessage('Analyst report generated.');
      await loadInvestigationDetails(selectedInvestigation);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto scrollable-cyber bg-cyber-black/40">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyber-border pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-cyber text-neon-green">Investigation Workspace</h2>
            <p className="mt-1 max-w-3xl text-xs text-cyber-gray">
              Plan, execute, analyze, and preserve evidence for AI-guided reconnaissance workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded border border-cyber-border px-2 py-1 text-cyber-gray">
              LLM: {provider?.configured ? `${provider.provider}:${provider.model}` : 'fallback'}
            </span>
            <span className="rounded border border-cyber-border px-2 py-1 text-cyber-gray">
              MCP: {mcpServers.filter((server) => server.configured).length}/{mcpServers.length || 0} configured
            </span>
          </div>
        </div>

        {message && (
          <div className="rounded border border-warning-yellow/60 bg-warning-yellow/10 px-3 py-2 text-xs text-warning-yellow">
            {message}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <SectionHeader title="Request" meta={busy ? 'working' : 'ready'} />
            <div className="space-y-3">
              <label className="block text-xs text-cyber-gray">
                Target
                <input
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="example.com, user@example.com, 8.8.8.8"
                  className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none focus:border-neon-green"
                />
              </label>
              <label className="block text-xs text-cyber-gray">
                Objective
                <textarea
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                  rows={5}
                  className="mt-1 w-full resize-none rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none focus:border-neon-green"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-cyber-gray">
                  Iterations
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={maxIterations}
                    onChange={(event) => setMaxIterations(Number(event.target.value))}
                    className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none focus:border-neon-green"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-xs text-cyber-gray">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(event) => setDryRun(event.target.checked)}
                    className="h-4 w-4 accent-neon-green"
                  />
                  Dry run
                </label>
              </div>
              <label className="block text-xs text-cyber-gray">
                Approved tools
                <input
                  value={approvedTools}
                  onChange={(event) => setApprovedTools(event.target.value)}
                  placeholder="subfinder,httpx,nuclei"
                  className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none focus:border-neon-green"
                />
              </label>
              {approvalOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {approvalOptions.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => {
                        const next = new Set(approvedToolList);
                        next.has(tool) ? next.delete(tool) : next.add(tool);
                        setApprovedTools(Array.from(next).join(','));
                      }}
                      className={`rounded border px-2 py-1 text-[11px] ${approvedToolList.includes(tool) ? 'border-neon-cyan text-neon-cyan' : 'border-cyber-border text-cyber-gray'}`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-2">
                <button disabled={busy} onClick={handlePlanOnly} className="btn-cyber-secondary w-full disabled:opacity-50">
                  Generate Plan
                </button>
                <button disabled={busy} onClick={handleCreateInvestigation} className="btn-cyber-ghost w-full disabled:opacity-50">
                  Create Investigation
                </button>
                <button disabled={busy} onClick={handleRunWorkflow} className="btn-cyber-primary w-full disabled:opacity-50">
                  Run Workflow
                </button>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <SectionHeader title="Planner" meta={currentPlan?.plannerMode || 'no plan'} />
              {!currentPlan ? (
                <div className="py-12 text-center text-sm text-cyber-gray">Generate a plan to preview workflow steps.</div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded border border-cyber-border bg-cyber-black/60 p-3">
                    <p className="break-words text-xs text-cyber-gray">{currentPlan.reasoning}</p>
                  </div>
                  <div className="space-y-2">
                    {(currentPlan.steps || []).map((step, index) => (
                      <motion.div
                        key={step.id || index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded border border-cyber-border bg-cyber-black/40 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-neon-green">{step.tool}</div>
                            <div className="mt-1 break-words text-xs text-cyber-gray">{step.purpose}</div>
                          </div>
                          <span className="shrink-0 rounded border border-cyber-border px-2 py-1 text-[11px] text-cyber-gray">
                            {step.dependsOn?.length ? `after ${step.dependsOn.join(', ')}` : 'parallel'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <SectionHeader title="Analyst" meta={analysis?.analystMode || 'idle'} />
              {!analysis ? (
                <div className="py-12 text-center text-sm text-cyber-gray">Run a workflow or analyze a saved investigation.</div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className={`inline-flex rounded border px-2 py-1 ${statusClass[analysis.risk_level] || 'border-cyber-border text-cyber-gray'}`}>
                    {analysis.risk_level || 'UNKNOWN'}
                  </div>
                  <p className="break-words text-cyber-gray">{analysis.summary}</p>
                  <div>
                    <div className="mb-2 text-neon-green">Key findings</div>
                    <ul className="space-y-1 text-cyber-gray">
                      {(analysis.key_findings || []).map((item, index) => <li key={index} className="break-words">- {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-neon-cyan">Next actions</div>
                    <ul className="space-y-1 text-cyber-gray">
                      {(analysis.next_actions || []).map((item, index) => <li key={index} className="break-words">- {item}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <SectionHeader title="Investigations" meta={`${investigations.length} loaded`} />
            <div className="max-h-[420px] space-y-2 overflow-y-auto scrollable-cyber pr-1">
              {investigations.length === 0 ? (
                <div className="py-10 text-center text-xs text-cyber-gray">No Firebase-backed investigations loaded.</div>
              ) : investigations.map((item) => (
                <button
                  key={item.investigationId || item.id}
                  type="button"
                  onClick={() => loadInvestigationDetails(item)}
                  className={`w-full rounded border p-3 text-left transition-colors ${selectedInvestigation?.investigationId === item.investigationId ? 'border-neon-green bg-neon-green/10' : 'border-cyber-border bg-cyber-black/40 hover:border-neon-cyan'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-neon-green">{item.target}</span>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] ${statusClass[item.status] || 'border-cyber-border text-cyber-gray'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-cyber-gray">{item.userRequest || item.goal}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <SectionHeader
              title={selectedInvestigation ? `Evidence: ${selectedInvestigation.target}` : 'Evidence'}
              meta={selectedInvestigation ? `${evidence.length} records` : 'select investigation'}
            />
            {selectedInvestigation && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button disabled={busy} onClick={handleAnalyzeSelected} className="btn-cyber-secondary disabled:opacity-50">
                  Analyze Selected
                </button>
              </div>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-2 text-xs text-neon-green">Execution History</div>
                <div className="max-h-[360px] space-y-2 overflow-y-auto scrollable-cyber pr-1">
                  {executions.length === 0 ? (
                    <div className="rounded border border-cyber-border p-4 text-center text-xs text-cyber-gray">No executions yet.</div>
                  ) : executions.map((item) => (
                    <div key={item.id || `${item.stepId}-${item.startedAt}`} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-neon-cyan">{item.tool}</span>
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] ${statusClass[item.status] || 'border-cyber-border text-cyber-gray'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-2 break-words text-[11px] text-cyber-gray">
                        {JSON.stringify(item.outputSummary || {}).slice(0, 220)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-2 text-xs text-neon-green">Evidence Store</div>
                <div className="max-h-[360px] space-y-2 overflow-y-auto scrollable-cyber pr-1">
                  {evidence.length === 0 ? (
                    <div className="rounded border border-cyber-border p-4 text-center text-xs text-cyber-gray">No evidence yet.</div>
                  ) : evidence.map((item) => (
                    <div key={item.id} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ToolPill tool={item.tool || item.type} />
                        <span className="text-[10px] text-cyber-gray">{item.source}</span>
                      </div>
                      <div className="mt-2 break-words text-[11px] text-cyber-gray">
                        {JSON.stringify(item.summary || {}).slice(0, 240)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {workflowResult && (
          <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <SectionHeader title="Workflow Result" meta={`${workflowResult.iterations?.length || 0} iteration(s)`} />
            <div className="flex flex-wrap gap-2">
              {(workflowResult.completedTools || []).map((tool) => <ToolPill key={tool} tool={tool} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default InvestigationDashboard;
