import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CompliancePanel = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ resolved: false, severity: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    fetchViolations();
  }, [filter]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      let url = `/api/compliance/violations?resolved=${filter.resolved}`;
      if (filter.severity) url += `&severity=${filter.severity}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setViolations(data.violations || []);
    } catch (err) {
      console.error('Failed to fetch violations', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveViolation = async (id, notes = "Resolved by operator") => {
    try {
      const response = await fetch(`/api/compliance/violations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        if (!filter.resolved) {
          setViolations(violations.filter(v => v.id !== id));
        } else {
          fetchViolations();
        }
        if (selectedViolation?.id === id) setSelectedViolation(null);
      }
    } catch (err) {
      console.error('Failed to resolve violation', err);
    }
  };

  const filteredViolations = violations.filter(v => 
    (v.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.violation_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity) => {
    if (!severity) return 'text-cyber-gray border-cyber-border bg-cyber-light';
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-danger-red border-danger-red bg-danger-red bg-opacity-10';
      case 'high': return 'text-orange-500 border-orange-500 bg-orange-500 bg-opacity-10';
      case 'medium': return 'text-warning-yellow border-warning-yellow bg-warning-yellow bg-opacity-10';
      case 'low': return 'text-neon-cyan border-neon-cyan bg-neon-cyan bg-opacity-10';
      default: return 'text-cyber-gray border-cyber-border bg-cyber-light';
    }
  };

  return (
    <div className="flex flex-col h-full bg-cyber-dark text-cyber-gray font-mono overflow-hidden relative">
      <div className="p-4 border-b border-cyber-border bg-cyber-light">
        <h2 className="text-sm font-bold flex items-center text-neon-green uppercase tracking-widest">
          <span className="mr-2">🛡️</span>
          Policy Violations
        </h2>
      </div>

      {/* Search and Filter */}
      <div className="p-4 space-y-3 bg-cyber-dark border-b border-cyber-border">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">🔍</span>
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="w-full pl-9 pr-4 py-2 bg-cyber-black border border-cyber-border rounded text-[10px] focus:outline-none focus:border-neon-green text-neon-green"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-cyber-black border border-cyber-border rounded text-[9px] p-2 flex-grow outline-none focus:border-neon-cyan text-cyber-gray uppercase font-bold"
            value={filter.severity}
            onChange={(e) => setFilter({...filter, severity: e.target.value})}
          >
            <option value="">ALL SEVERITIES</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
          <button 
            className={`px-2 py-2 rounded text-[9px] font-bold transition uppercase tracking-tighter border ${filter.resolved ? 'bg-neon-green text-cyber-black border-neon-green' : 'bg-cyber-black text-cyber-gray border-cyber-border hover:border-neon-green'}`}
            onClick={() => setFilter({...filter, resolved: !filter.resolved})}
          >
            {filter.resolved ? 'RESOLVED' : 'ACTIVE'}
          </button>
        </div>
      </div>

      {/* Violation List */}
      <div className="flex-grow overflow-y-auto divide-y divide-cyber-border divide-opacity-30 scrollable-cyber">
        {loading && violations.length === 0 ? (
          <div className="p-8 text-center text-cyber-gray">
            <div className="loading-spinner mb-2 scale-75" />
            <p className="text-[10px] uppercase font-bold">Querying DB...</p>
          </div>
        ) : filteredViolations.length > 0 ? (
          filteredViolations.map((v) => (
            <div 
              key={v.id} 
              className={`p-4 cursor-pointer hover:bg-cyber-light transition border-l-2 ${selectedViolation?.id === v.id ? 'border-neon-cyan bg-cyber-light bg-opacity-50' : 'border-transparent'}`}
              onClick={() => setSelectedViolation(v)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase ${getSeverityColor(v.severity)}`}>
                  {v.severity || 'UNKNOWN'}
                </span>
                <span className="text-[9px] text-cyber-gray font-mono opacity-50">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-[11px] truncate text-gray-200">{(v.violation_type || 'incident').replace(/_/g, ' ').toUpperCase()}</h3>
              <p className="text-[10px] text-cyber-gray mt-1 line-clamp-2 leading-relaxed font-mono italic">"{v.message}"</p>
              <div className="mt-2 flex items-center text-[9px] text-cyber-gray font-mono border-t border-cyber-border border-opacity-20 pt-1">
                <span className="truncate">SOURCE: {v.source}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <span className="text-3xl block mb-2 opacity-20">✅</span>
            <p className="text-[10px] text-cyber-gray uppercase tracking-widest font-bold">No active threats</p>
          </div>
        )}
      </div>

      {/* Details Slide-over */}
      <AnimatePresence>
        {selectedViolation && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-cyber-darker z-20 flex flex-col border-l border-neon-cyan border-opacity-30 shadow-2xl"
          >
            <div className="p-4 border-b border-cyber-border bg-cyber-dark flex justify-between items-center">
              <h3 className="font-bold text-[11px] uppercase tracking-widest text-neon-cyan">INCIDENT_ANALYSIS</h3>
              <button 
                onClick={() => setSelectedViolation(null)}
                className="p-1 hover:bg-cyber-light rounded transition text-neon-cyan"
              >
                <span>❌</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-grow space-y-6 scrollable-cyber">
              <div className="space-y-4">
                <span className={`text-[9px] px-2 py-1 rounded border font-black uppercase tracking-widest ${getSeverityColor(selectedViolation.severity)}`}>
                  {(selectedViolation.severity || 'UNKNOWN').toUpperCase()}
                </span>
                <h2 className="text-lg font-cyber text-white leading-tight">{(selectedViolation.violation_type || 'violation').replace(/_/g, ' ').toUpperCase()}</h2>
                <div className="bg-cyber-black border border-cyber-border rounded p-4 border-opacity-50">
                  <p className="text-xs text-neon-green/80 leading-relaxed font-mono italic">"{selectedViolation.message}"</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-cyber-black border border-cyber-border rounded">
                  <p className="text-cyber-gray text-[8px] mb-1 uppercase tracking-widest font-bold">TIMESTAMP</p>
                  <p className="text-[10px] font-mono">{new Date(selectedViolation.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-cyber-black border border-cyber-border rounded">
                  <p className="text-cyber-gray text-[8px] mb-1 uppercase tracking-widest font-bold">ORIGIN</p>
                  <p className="text-[10px] font-bold text-neon-cyan">{selectedViolation.source}</p>
                </div>
                <div className="p-3 bg-cyber-black border border-cyber-border rounded">
                  <p className="text-cyber-gray text-[8px] mb-1 uppercase tracking-widest font-bold">TASK_ID</p>
                  <p className="text-[9px] font-mono text-cyber-gray truncate">{selectedViolation.collection_id || 'NULL'}</p>
                </div>
              </div>

              {selectedViolation.metadata && (
                <div>
                  <p className="text-cyber-gray text-[8px] mb-2 uppercase tracking-widest font-bold">DEBUG_PAYLOAD</p>
                  <div className="p-4 bg-cyber-black border border-cyber-border rounded font-mono text-[9px] overflow-x-auto max-h-48 scrollable-cyber border-opacity-50">
                    <pre className="text-neon-cyan/60">{JSON.stringify(selectedViolation.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}

              {!selectedViolation.resolved ? (
                <div className="pt-4 sticky bottom-0 bg-cyber-darker pb-2">
                  <button 
                    onClick={() => resolveViolation(selectedViolation.id)}
                    className="w-full py-3 bg-neon-green text-cyber-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-neon-green/10 flex items-center justify-center transition-all active:scale-95 hover:bg-opacity-90"
                  >
                    <span>✅</span>
                    <span className="ml-2">RESOLVE_THREAT</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 border border-safe-green border-opacity-30 rounded bg-safe-green bg-opacity-5 flex items-center text-safe-green">
                  <span className="mr-3">✅</span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-tighter">THREAT_NEUTRALIZED</p>
                    <p className="text-[10px] opacity-70 font-mono">{selectedViolation.resolved_at ? new Date(selectedViolation.resolved_at).toLocaleString() : 'RECENT'}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompliancePanel;
