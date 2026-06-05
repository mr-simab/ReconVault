import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { auditAPI, caseAPI, iocAPI, queueAPI, reportsAPI, rbacAPI, timelineAPI } from '../../services/api';

const tabs = [
  { id: 'cases', label: 'Cases' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'iocs', label: 'IOC Database' },
  { id: 'reports', label: 'Reports' },
  { id: 'audit', label: 'Audit Logs' }
];

const priorityClass = {
  critical: 'border-danger-red text-danger-red',
  high: 'border-neon-orange text-neon-orange',
  medium: 'border-warning-yellow text-warning-yellow',
  low: 'border-safe-green text-safe-green'
};

function EmptyState({ label }) {
  return <div className="rounded border border-cyber-border p-6 text-center text-xs text-cyber-gray">{label}</div>;
}

function Field({ label, children }) {
  return (
    <label className="block text-xs text-cyber-gray">
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none focus:border-neon-green ${props.className || ''}`}
    />
  );
}

const IntelligenceOpsDashboard = () => {
  const [activeTab, setActiveTab] = useState('cases');
  const [cases, setCases] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [iocs, setIocs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [queueJobs, setQueueJobs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [caseForm, setCaseForm] = useState({ title: '', description: '', priority: 'medium', tags: '' });
  const [iocForm, setIocForm] = useState({ type: 'DOMAIN', value: '', tags: '' });
  const [iocQuery, setIocQuery] = useState('');
  const [reportInvestigationId, setReportInvestigationId] = useState('');
  const [reportFormat, setReportFormat] = useState('json');
  const [reportPreview, setReportPreview] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([
      caseAPI.listCases({ limit: 50 }),
      timelineAPI.listTimeline({ limit: 100 }),
      iocAPI.listIocs({ limit: 100 }),
      auditAPI.listAuditLogs({ limit: 100 }),
      queueAPI.listJobs({ limit: 50 }),
      rbacAPI.listRoles()
    ]);

    if (results[0].status === 'fulfilled') setCases(results[0].value.data || []);
    if (results[1].status === 'fulfilled') setTimeline(results[1].value.data || []);
    if (results[2].status === 'fulfilled') setIocs(results[2].value.data || []);
    if (results[3].status === 'fulfilled') setAuditLogs(results[3].value.data || []);
    if (results[4].status === 'fulfilled') setQueueJobs(results[4].value.data || []);
    if (results[5].status === 'fulfilled') setRoles(results[5].value.data || []);

    const failed = results.find((result) => result.status === 'rejected');
    if (failed) setMessage('Some operations data needs Firebase or permission setup.');
  }, []);

  useEffect(() => {
    loadAll().catch((error) => setMessage(error.message));
  }, [loadAll]);

  const createCase = async () => {
    if (!caseForm.title.trim()) {
      setMessage('Case title is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const record = await caseAPI.createCase({
        title: caseForm.title.trim(),
        description: caseForm.description,
        priority: caseForm.priority,
        tags: caseForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      });
      setCases((prev) => [record, ...prev]);
      setCaseForm({ title: '', description: '', priority: 'medium', tags: '' });
      await loadAll();
      setMessage('Case created.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const createIoc = async () => {
    if (!iocForm.value.trim()) {
      setMessage('IOC value is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const record = await iocAPI.createIoc({
        type: iocForm.type,
        value: iocForm.value.trim(),
        tags: iocForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        confidence: 70
      });
      setIocs((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      setIocForm({ type: 'DOMAIN', value: '', tags: '' });
      await loadAll();
      setMessage('IOC saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const searchIocs = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await iocAPI.searchIocs({ query: iocQuery });
      setIocs(response.data || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const exportReport = async () => {
    if (!reportInvestigationId.trim()) {
      setMessage('Investigation ID is required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await reportsAPI.exportInvestigationReport(reportInvestigationId.trim(), reportFormat);
      const body = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
      setReportPreview(body.slice(0, 12000));
      setMessage('Report exported.');
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
          <div>
            <h2 className="text-xl font-cyber text-neon-green">Intelligence Operations</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded border px-3 py-2 text-xs transition-colors ${activeTab === tab.id ? 'border-neon-green text-neon-green bg-neon-green/10' : 'border-cyber-border text-cyber-gray hover:border-neon-cyan hover:text-neon-cyan'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded border border-cyber-border px-2 py-1 text-cyber-gray">{cases.length} cases</span>
            <span className="rounded border border-cyber-border px-2 py-1 text-cyber-gray">{iocs.length} IOCs</span>
            <span className="rounded border border-cyber-border px-2 py-1 text-cyber-gray">{roles.length} roles</span>
          </div>
        </div>

        {message && (
          <div className="rounded border border-warning-yellow/60 bg-warning-yellow/10 px-3 py-2 text-xs text-warning-yellow">
            {message}
          </div>
        )}

        {activeTab === 'cases' && (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neon-green">New Case</h3>
              <div className="space-y-3">
                <Field label="Title"><TextInput value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} /></Field>
                <Field label="Description"><TextInput value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} /></Field>
                <Field label="Priority">
                  <select value={caseForm.priority} onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value })} className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </Field>
                <Field label="Tags"><TextInput value={caseForm.tags} onChange={(e) => setCaseForm({ ...caseForm, tags: e.target.value })} placeholder="brand, phishing, vip" /></Field>
                <button disabled={busy} onClick={createCase} className="btn-cyber-primary w-full disabled:opacity-50">Create Case</button>
              </div>
            </section>
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neon-green">Cases</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {cases.length === 0 ? <EmptyState label="No cases loaded." /> : cases.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-neon-green">{item.title}</div>
                        <div className="mt-1 break-words text-xs text-cyber-gray">{item.description}</div>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] ${priorityClass[item.priority] || 'border-cyber-border text-cyber-gray'}`}>{item.priority}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(item.tags || []).map((tag) => <span key={tag} className="rounded border border-cyber-border px-2 py-0.5 text-[10px] text-cyber-gray">{tag}</span>)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'timeline' && (
          <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neon-green">Timeline</h3>
            <div className="space-y-2">
              {timeline.length === 0 ? <EmptyState label="No timeline entries loaded." /> : timeline.map((item) => (
                <div key={item.id} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-neon-cyan">{item.eventType}</span>
                    <span className="text-[10px] text-cyber-gray">{item.createdAt}</span>
                  </div>
                  <div className="mt-1 text-sm text-neon-green">{item.title}</div>
                  <div className="mt-1 break-words text-xs text-cyber-gray">{item.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'iocs' && (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neon-green">IOC Entry</h3>
              <div className="space-y-3">
                <Field label="Type">
                  <select value={iocForm.type} onChange={(e) => setIocForm({ ...iocForm, type: e.target.value })} className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none">
                    {['IP', 'DOMAIN', 'EMAIL', 'URL', 'HASH', 'ASN', 'ORGANIZATION'].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Value"><TextInput value={iocForm.value} onChange={(e) => setIocForm({ ...iocForm, value: e.target.value })} /></Field>
                <Field label="Tags"><TextInput value={iocForm.tags} onChange={(e) => setIocForm({ ...iocForm, tags: e.target.value })} /></Field>
                <button disabled={busy} onClick={createIoc} className="btn-cyber-primary w-full disabled:opacity-50">Save IOC</button>
              </div>
            </section>
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <TextInput value={iocQuery} onChange={(e) => setIocQuery(e.target.value)} placeholder="Search IOC value" className="max-w-sm" />
                <button disabled={busy} onClick={searchIocs} className="btn-cyber-secondary disabled:opacity-50">Search</button>
                <button disabled={busy} onClick={loadAll} className="btn-cyber-ghost disabled:opacity-50">Reload</button>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {iocs.length === 0 ? <EmptyState label="No IOCs loaded." /> : iocs.map((item) => (
                  <div key={item.id} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-neon-green">{item.value}</span>
                      <span className="shrink-0 rounded border border-neon-cyan px-2 py-0.5 text-[10px] text-neon-cyan">{item.type}</span>
                    </div>
                    <div className="mt-2 text-xs text-cyber-gray">Risk {item.riskLevel} / Confidence {item.confidence}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.tags || []).map((tag) => <span key={tag} className="rounded border border-cyber-border px-2 py-0.5 text-[10px] text-cyber-gray">{tag}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'reports' && (
          <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neon-green">Investigation Report</h3>
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,360px)_180px_140px]">
              <Field label="Investigation ID"><TextInput value={reportInvestigationId} onChange={(e) => setReportInvestigationId(e.target.value)} /></Field>
              <Field label="Format">
                <select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} className="mt-1 w-full rounded border border-cyber-border bg-cyber-black px-3 py-2 text-sm text-neon-green outline-none">
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="pdf-html">PDF-ready HTML</option>
                </select>
              </Field>
              <button disabled={busy} onClick={exportReport} className="btn-cyber-primary self-end disabled:opacity-50">Export</button>
            </div>
            <pre className="max-h-[520px] overflow-auto rounded border border-cyber-border bg-cyber-black/60 p-3 text-xs text-cyber-gray scrollable-cyber">
              {reportPreview || 'No report loaded.'}
            </pre>
          </section>
        )}

        {activeTab === 'audit' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neon-green">Audit Logs</h3>
              <div className="space-y-2">
                {auditLogs.length === 0 ? <EmptyState label="No audit logs loaded." /> : auditLogs.map((item) => (
                  <div key={item.id} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-neon-cyan">{item.action}</span>
                      <span className="text-[10px] text-cyber-gray">{item.createdAt}</span>
                    </div>
                    <div className="mt-1 text-xs text-cyber-gray">{item.targetType}: {item.targetId}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded border border-cyber-border bg-cyber-dark/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neon-green">Queue</h3>
              <div className="space-y-2">
                {queueJobs.length === 0 ? <EmptyState label="No queue jobs loaded." /> : queueJobs.map((item) => (
                  <div key={item.id} className="rounded border border-cyber-border bg-cyber-black/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-neon-green">{item.type}</span>
                      <span className="shrink-0 rounded border border-cyber-border px-2 py-0.5 text-[10px] text-cyber-gray">{item.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-cyber-gray">{item.enqueuedAt}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceOpsDashboard;
