import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
      const response = await fetch('/api/compliance/status');
      if (!response.ok) throw new Error('Failed to fetch compliance stats');
      const data = await response.json();
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
        <span className="text-4xl mb-4">⚠️</span>
        <h3 className="text-xl font-bold">Monitor Failure</h3>
        <p className="mt-2">{error}</p>
        <button 
          onClick={fetchStats}
          className="mt-6 px-6 py-2 bg-danger-red text-white rounded font-bold hover:bg-red-600 transition"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto h-full text-cyber-gray bg-cyber-black font-mono scrollable-cyber">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-cyber-border pb-6">
        <div>
          <h1 className="text-3xl font-cyber text-neon-green flex items-center">
            <span className="mr-3 text-4xl">🛡️</span>
            Ethics & Compliance
          </h1>
          <p className="text-cyber-gray mt-2 text-sm">Real-time OSINT policy enforcement and autonomous violation tracking</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center px-4 py-2 rounded border ${
            stats?.status === 'green' ? 'border-safe-green bg-safe-green bg-opacity-10 text-safe-green' :
            stats?.status === 'red' ? 'border-danger-red bg-danger-red bg-opacity-10 text-danger-red' :
            'border-warning-yellow bg-warning-yellow bg-opacity-10 text-warning-yellow'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
              stats?.status === 'green' ? 'bg-safe-green' :
              stats?.status === 'red' ? 'bg-danger-red' : 'bg-warning-yellow'
            }`}></span>
            <span className="font-bold uppercase tracking-widest text-xs">
              STATUS: {stats?.status || 'UNKNOWN'}
            </span>
          </div>
          <button 
            onClick={fetchStats}
            className="p-2 rounded border border-cyber-border bg-cyber-light hover:border-neon-green text-neon-green transition"
            title="Refresh System"
          >
            <span className={loading ? 'animate-spin block' : ''}>🔄</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="COMPLIANCE SCORE" 
          value={`${stats?.compliance_score?.toFixed(1) || '0.0'}%`}
          icon="🛡️"
          trend={stats?.compliance_score > 90 ? 'OPTIMAL' : 'DEGRADED'}
          trendColor={stats?.compliance_score > 90 ? 'text-safe-green' : 'text-warning-yellow'}
        />
        <MetricCard 
          title="TOTAL VIOLATIONS" 
          value={stats?.total_violations || 0}
          icon="⚠️"
          subtitle="Lifetime entries"
        />
        <MetricCard 
          title="UNRESOLVED" 
          value={stats?.unresolved_violations || 0}
          icon="🚨"
          subtitle={`${stats?.critical_violations || 0} critical threats`}
          color={stats?.unresolved_violations > 0 ? 'text-danger-red' : 'text-safe-green'}
        />
        <MetricCard 
          title="LAST INCIDENT" 
          value={stats?.last_violation ? new Date(stats.last_violation).toLocaleTimeString() : 'CLEAN'}
          icon="🕒"
          subtitle={stats?.last_violation ? new Date(stats.last_violation).toLocaleDateString() : 'No recent issues'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Violations Feed */}
        <div className="lg:col-span-2 bg-cyber-dark border border-cyber-border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-cyber-border flex justify-between items-center bg-cyber-light">
            <h2 className="font-bold text-neon-green flex items-center text-sm">
              <span className="mr-2">📝</span>
              INCIDENT LOG
            </h2>
            <button className="text-[10px] text-neon-cyan hover:underline uppercase tracking-widest font-bold">Terminal View</button>
          </div>
          <div className="divide-y divide-cyber-border overflow-y-auto max-h-[500px] scrollable-cyber">
            {stats?.violations?.length > 0 ? (
              stats.violations.map((violation) => (
                <div key={violation.id} className="p-4 hover:bg-cyber-light transition group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getSeverityColor(violation.severity)}`}>
                      {(violation.severity || 'UNKNOWN').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-cyber-gray font-mono">
                      [{new Date(violation.created_at).toLocaleString()}]
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-200 text-sm">{(violation.violation_type || 'violation').replace(/_/g, ' ').toUpperCase()}</h3>
                  <p className="text-xs text-cyber-gray mt-1 font-mono leading-relaxed">{violation.message}</p>
                  <div className="mt-3 flex items-center text-[10px] text-cyber-gray space-x-4 border-t border-cyber-border pt-2 border-opacity-30">
                    <span>SOURCE: <span className="text-neon-cyan">{violation.source}</span></span>
                    <span>TASK: <span className="text-neon-green font-mono">{violation.collection_id?.substring(0, 8) || 'N/A'}...</span></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-cyber-gray opacity-50">
                <span className="text-4xl block mb-4">✅</span>
                <p className="text-sm">SYSTEM COMPLIANT - NO VIOLATIONS RECORDED</p>
              </div>
            )}
          </div>
        </div>

        {/* Policy Overview */}
        <div className="space-y-6">
          <div className="bg-cyber-dark border border-cyber-border rounded-lg p-5">
            <h2 className="font-bold text-sm mb-4 flex items-center text-neon-cyan uppercase tracking-widest border-b border-cyber-border pb-2">
              <span className="mr-2">⚙️</span>
              POLICIES
            </h2>
            <ul className="space-y-4">
              <PolicyItem label="Robots.txt Engine" status="ACTIVE" />
              <PolicyItem label="Global Rate Limits" status="ENFORCED" />
              <PolicyItem label="UA Rotation" status="ENABLED" />
              <PolicyItem label="PII Scrubbing" status="ACTIVE" />
              <PolicyItem label="Domain Blacklist" status="PROTECTED" />
              <PolicyItem label="Honeypot Shield" status="ACTIVE" />
            </ul>
            <button className="w-full mt-6 py-2 border border-cyber-border bg-cyber-light hover:border-neon-cyan text-neon-cyan rounded text-xs font-bold transition">
              CONFIGURE PROTOCOLS
            </button>
          </div>

          <div className="bg-neon-cyan bg-opacity-5 border border-neon-cyan border-opacity-30 rounded-lg p-5">
            <h2 className="font-bold text-neon-cyan mb-2 text-sm uppercase">AUDIT REPORTING</h2>
            <p className="text-[10px] text-cyber-gray mb-4 leading-relaxed">Generate encrypted compliance dossiers for regulatory verification and operational oversight.</p>
            <button className="flex items-center justify-center w-full py-2 bg-neon-cyan text-cyber-black font-bold rounded text-xs transition hover:bg-opacity-80">
              DOWNLOAD COMPLIANCE.PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, subtitle, trend, trendColor, color = "text-white" }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-cyber-dark border border-cyber-border p-5 rounded-lg flex flex-col h-full relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-2 opacity-10 text-3xl">{icon}</div>
    <div className="flex justify-between items-start mb-4">
      <div className="text-2xl">{icon}</div>
      {trend && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border border-opacity-30 bg-cyber-light ${trendColor} border-current`}>{trend}</span>
      )}
    </div>
    <h3 className="text-cyber-gray text-[10px] font-bold tracking-widest uppercase">{title}</h3>
    <p className={`text-2xl font-cyber mt-1 ${color}`}>{value}</p>
    {subtitle && <p className="text-[10px] text-cyber-gray mt-2 flex-grow opacity-70 italic font-mono">{subtitle}</p>}
  </motion.div>
);

const PolicyItem = ({ label, status }) => (
  <li className="flex justify-between items-center text-xs">
    <span className="text-cyber-gray">{label}</span>
    <span className="text-neon-green font-bold px-2 py-0.5 bg-neon-green bg-opacity-10 rounded border border-neon-green border-opacity-30 text-[9px] uppercase tracking-wider">{status}</span>
  </li>
);

export default ComplianceDashboard;
