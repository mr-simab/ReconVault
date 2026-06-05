import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { complianceAPI } from '../../services/api';
import GlassIcon from '../Common/GlassIcon';

const ComplianceDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await complianceAPI.getComplianceStatus();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (!severity) return 'border-cyber-border text-cyber-gray';
    switch (severity.toLowerCase()) {
      case 'critical': return 'border-danger-red text-danger-red bg-danger-red bg-opacity-10';
      case 'high': return 'border-orange-500 text-orange-500 bg-orange-500 bg-opacity-10';
      case 'medium': return 'border-warning-yellow text-warning-yellow bg-warning-yellow bg-opacity-10';
      case 'low': return 'border-neon-cyan text-neon-cyan bg-neon-cyan bg-opacity-10';
      default: return 'border-cyber-border text-cyber-gray';
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neon-green font-mono">
        <div className="loading-spinner mb-4" />
        <span>Initializing Compliance Monitor...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-danger-red p-6 font-mono">
        <GlassIcon name="alert" size="xl" tone="red" />
        <h3 className="text-xl font-bold mt-4">Monitor Failure</h3>
        <p className="mt-2">{error}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="rv-command-button mt-6 px-6 py-2 text-danger-red hover:text-white hover:border-danger-red font-bold"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const statusTone = stats?.status === 'green' ? 'green' : stats?.status === 'red' ? 'red' : 'yellow';

  return (
    <div className="h-full overflow-auto text-cyber-gray font-mono scrollable-cyber p-6">
      <div className="glass-panel-dark p-5 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <GlassIcon name="shield" size="xl" tone="green" />
            <div>
              <h1 className="text-3xl font-cyber text-neon-green leading-tight">Ethics & Compliance</h1>
              <p className="text-cyber-gray mt-1 text-sm">Real-time OSINT policy enforcement and violation tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center px-4 py-2 rounded border ${
              stats?.status === 'green' ? 'border-safe-green bg-safe-green bg-opacity-10 text-safe-green' :
              stats?.status === 'red' ? 'border-danger-red bg-danger-red bg-opacity-10 text-danger-red' :
              'border-warning-yellow bg-warning-yellow bg-opacity-10 text-warning-yellow'
            }`}>
              <span className="rv-status-dot mr-2" />
              <span className="font-bold uppercase tracking-widest text-xs">Status: {stats?.status || 'UNKNOWN'}</span>
            </div>
            <button
              type="button"
              onClick={fetchStats}
              className="rv-icon-button w-10 h-10 flex items-center justify-center text-neon-green"
              title="Refresh System"
            >
              <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}>
                <GlassIcon name="refresh" size="sm" tone={statusTone} />
              </motion.span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="COMPLIANCE SCORE"
          value={`${stats?.compliance_score?.toFixed(1) || '0.0'}%`}
          icon="shield"
          tone="green"
          trend={stats?.compliance_score > 90 ? 'OPTIMAL' : 'DEGRADED'}
          trendColor={stats?.compliance_score > 90 ? 'text-safe-green' : 'text-warning-yellow'}
        />
        <MetricCard
          title="TOTAL VIOLATIONS"
          value={stats?.total_violations || 0}
          icon="risk"
          tone="yellow"
          subtitle="Lifetime entries"
        />
        <MetricCard
          title="UNRESOLVED"
          value={stats?.unresolved_violations || 0}
          icon="alert"
          tone={stats?.unresolved_violations > 0 ? 'red' : 'green'}
          subtitle={`${stats?.critical_violations || 0} critical threats`}
          color={stats?.unresolved_violations > 0 ? 'text-danger-red' : 'text-safe-green'}
        />
        <MetricCard
          title="LAST INCIDENT"
          value={stats?.last_violation ? new Date(stats.last_violation).toLocaleTimeString() : 'CLEAN'}
          icon="clock"
          tone="cyan"
          subtitle={stats?.last_violation ? new Date(stats.last_violation).toLocaleDateString() : 'No recent issues'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel overflow-hidden flex flex-col">
          <div className="p-4 border-b rv-soft-divider flex justify-between items-center">
            <h2 className="font-bold text-neon-green flex items-center gap-2 text-sm uppercase">
              <GlassIcon name="evidence" size="xs" tone="green" />
              Incident Log
            </h2>
            <button type="button" className="rv-command-button px-3 py-1.5 text-[10px] text-neon-cyan uppercase tracking-widest font-bold flex items-center gap-2">
              <GlassIcon name="terminal" size="xs" tone="cyan" />
              Terminal View
            </button>
          </div>
          <div className="divide-y divide-cyber-border overflow-y-auto max-h-[500px] scrollable-cyber">
            {stats?.violations?.length > 0 ? (
              stats.violations.map((violation) => (
                <div key={violation.id} className="p-4 hover:bg-cyber-light transition group">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getSeverityColor(violation.severity)}`}>
                      {(violation.severity || 'UNKNOWN').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-cyber-gray font-mono">
                      [{new Date(violation.created_at).toLocaleString()}]
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-200 text-sm">{(violation.violation_type || 'violation').replace(/_/g, ' ').toUpperCase()}</h3>
                  <p className="text-xs text-cyber-gray mt-1 font-mono leading-relaxed">{violation.message}</p>
                  <div className="mt-3 flex items-center text-[10px] text-cyber-gray gap-4 border-t rv-soft-divider pt-2">
                    <span>SOURCE: <span className="text-neon-cyan">{violation.source}</span></span>
                    <span>TASK: <span className="text-neon-green font-mono">{violation.collection_id?.substring(0, 8) || 'N/A'}...</span></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-cyber-gray opacity-70">
                <div className="flex justify-center mb-4">
                  <GlassIcon name="check" size="xl" tone="green" />
                </div>
                <p className="text-sm">SYSTEM COMPLIANT - NO VIOLATIONS RECORDED</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-5">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-neon-cyan uppercase tracking-widest border-b rv-soft-divider pb-2">
              <GlassIcon name="settings" size="xs" tone="cyan" />
              Policies
            </h2>
            <ul className="space-y-4">
              <PolicyItem label="Robots.txt Engine" status="ACTIVE" />
              <PolicyItem label="Global Rate Limits" status="ENFORCED" />
              <PolicyItem label="UA Rotation" status="ENABLED" />
              <PolicyItem label="PII Scrubbing" status="ACTIVE" />
              <PolicyItem label="Domain Blacklist" status="PROTECTED" />
              <PolicyItem label="Honeypot Shield" status="ACTIVE" />
            </ul>
            <button type="button" className="rv-command-button w-full mt-6 py-2 text-neon-cyan rounded text-xs font-bold transition">
              CONFIGURE PROTOCOLS
            </button>
          </div>

          <div className="glass-panel p-5 border-neon-cyan border-opacity-30">
            <h2 className="font-bold text-neon-cyan mb-2 text-sm uppercase flex items-center gap-2">
              <GlassIcon name="report" size="xs" tone="cyan" />
              Audit Reporting
            </h2>
            <p className="text-[10px] text-cyber-gray mb-4 leading-relaxed">Generate compliance dossiers for regulatory verification and operational oversight.</p>
            <button type="button" className="flex items-center justify-center gap-2 w-full py-2 bg-neon-cyan text-cyber-black font-bold rounded text-xs transition hover:bg-opacity-80">
              <GlassIcon name="download" size="xs" bare />
              DOWNLOAD COMPLIANCE.PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, tone, subtitle, trend, trendColor, color = 'text-white' }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rv-metric-tile p-5 flex flex-col h-full"
  >
    <div className="flex justify-between items-start mb-4">
      <GlassIcon name={icon} size="md" tone={tone} />
      {trend && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border border-opacity-30 bg-cyber-light ${trendColor} border-current`}>{trend}</span>
      )}
    </div>
    <h3 className="text-cyber-gray text-[10px] font-bold tracking-widest uppercase">{title}</h3>
    <p className={`text-2xl font-cyber mt-1 ${color}`}>{value}</p>
    {subtitle && <p className="text-[10px] text-cyber-gray mt-2 flex-grow opacity-80 font-mono">{subtitle}</p>}
  </motion.div>
);

const PolicyItem = ({ label, status }) => (
  <li className="flex justify-between items-center text-xs gap-3">
    <span className="text-cyber-gray">{label}</span>
    <span className="text-neon-green font-bold px-2 py-0.5 bg-neon-green bg-opacity-10 rounded border border-neon-green border-opacity-30 text-[9px] uppercase tracking-wider">{status}</span>
  </li>
);

export default ComplianceDashboard;
