// Export Panel Component - Report generation and data export
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { reportsAPI } from '../../services/api';

const ExportPanel = ({ onExport = () => {}, className = '' }) => {
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [selectedTemplate, setSelectedTemplate] = useState('detailed_analysis');
  const [templates, setTemplates] = useState([]);
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [filters, setFilters] = useState({
    target_id: null,
    include_entities: true,
    include_relationships: true,
    include_risk_analysis: true
  });

  useEffect(() => {
    loadTemplates();
    loadFormats();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await reportsAPI.listTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadFormats = async () => {
    try {
      const data = await reportsAPI.listFormats();
      setFormats(data.formats || []);
    } catch (error) {
      console.error('Failed to load formats:', error);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await reportsAPI.previewReport(selectedTemplate, filters);
      setPreview(data);
    } catch (error) {
      console.error('Failed to preview report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const options = {
        format: selectedFormat,
        template: selectedTemplate,
        ...filters
      };

      if (selectedFormat === 'json') {
        const data = await reportsAPI.generateReport(selectedFormat, selectedTemplate, options);
        downloadJSON(data.data, `reconvault_report_${new Date().toISOString().slice(0,10)}.json`);
      } else {
        // For file formats, the API handles download
        const response = await reportsAPI.generateReport(selectedFormat, selectedTemplate, options);
        // Handle file download from blob
        if (response instanceof Blob || response.data instanceof Blob) {
          const blob = response.data || response;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reconvault_report_${new Date().toISOString().slice(0,10)}.${selectedFormat}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }

      onExport(options);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const formatIcons = {
    json: '📄',
    csv: '📊',
    html: '🌐',
    pdf: '📑',
    graphml: '🕸️',
    gexf: '🔷'
  };

  const templateDescriptions = {
    executive_summary: 'High-level overview for executives',
    detailed_analysis: 'Comprehensive technical analysis',
    risk_assessment: 'Focused risk scoring and analysis',
    compliance_report: 'Ethics and compliance monitoring',
    custom: 'Build your own report'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* Format Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">
          Export Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {formats.map((format) => (
            <motion.button
              key={format.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedFormat(format.id)}
              disabled={loading}
              className={`
                p-3 rounded-lg border text-left transition-all duration-200
                ${selectedFormat === format.id
                  ? 'border-neon-cyan bg-neon-cyan bg-opacity-10 text-neon-cyan'
                  : 'border-cyber-border bg-cyber-light text-cyber-gray hover:border-neon-green hover:text-neon-green'
                }
              `}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{formatIcons[format.id] || '📄'}</span>
                <span className="font-mono text-sm font-medium capitalize">
                  {format.id}
                </span>
                {selectedFormat === format.id && (
                  <span className="text-xs">✓</span>
                )}
              </div>
              <p className="text-xs opacity-75 truncate">
                {format.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">
          Report Template
        </label>
        <div className="space-y-2">
          {templates.map((template) => (
            <motion.button
              key={template.id}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTemplate(template.id)}
              disabled={loading}
              className={`
                w-full p-3 rounded-lg border text-left transition-all duration-200
                ${selectedTemplate === template.id
                  ? 'border-neon-purple bg-neon-purple bg-opacity-10 text-neon-purple'
                  : 'border-cyber-border bg-cyber-light text-cyber-gray hover:border-neon-green hover:text-neon-green'
                }
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-mono text-sm font-medium">
                    {template.name}
                  </div>
                  <p className="text-xs opacity-75 mt-1">
                    {template.description}
                  </p>
                </div>
                {selectedTemplate === template.id && (
                  <span className="text-lg">✓</span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">
          Export Options
        </label>
        <div className="space-y-2">
          {[
            { key: 'include_entities', label: 'Include Entities', icon: '👥' },
            { key: 'include_relationships', label: 'Include Relationships', icon: '🔗' },
            { key: 'include_risk_analysis', label: 'Include Risk Analysis', icon: '⚠️' }
          ].map((option) => (
            <motion.label
              key={option.key}
              whileHover={{ scale: 1.01 }}
              className="
                flex items-center space-x-3 p-3 rounded-lg
                border border-cyber-border bg-cyber-light
                hover:border-neon-green transition-colors cursor-pointer
              "
            >
              <input
                type="checkbox"
                checked={filters[option.key]}
                onChange={() => setFilters(prev => ({
                  ...prev,
                  [option.key]: !prev[option.key]
                }))}
                disabled={loading}
                className="
                  w-4 h-4 rounded border-cyber-border
                  bg-cyber-dark text-neon-green
                  focus:ring-neon-cyan focus:ring-2
                "
              />
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm text-cyber-gray">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Target Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neon-cyan mb-1">
          Filter by Target ID (Optional)
        </label>
        <input
          type="number"
          min="1"
          value={filters.target_id || ''}
          onChange={(e) => setFilters(prev => ({
            ...prev,
            target_id: e.target.value ? parseInt(e.target.value) : null
          }))}
          placeholder="Enter target ID to filter..."
          className="
            w-full px-3 py-2 rounded
            bg-cyber-black border border-cyber-border
            text-neon-green text-sm
            focus:border-neon-cyan focus:outline-none
          "
          disabled={loading}
        />
      </div>

      {/* Preview Section */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 rounded-lg bg-cyber-light border border-cyber-border"
        >
          <h4 className="text-sm font-medium text-neon-green mb-2">Preview</h4>
          <div className="text-xs text-cyber-gray space-y-1">
            <div>Entities: {preview.preview?.sample_entities?.length || 0}</div>
            <div>Relationships: {preview.preview?.sample_relationships?.length || 0}</div>
            <div>Total Entities: {preview.preview?.summary?.total_entities || 0}</div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePreview}
          disabled={loading}
          className="
            w-full py-3 rounded-lg border border-cyber-border
            bg-cyber-light text-cyber-gray font-mono text-sm
            hover:border-neon-cyan hover:text-neon-cyan
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <span className="flex items-center justify-center space-x-2">
            <span>👁️</span>
            <span>Preview Report</span>
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          disabled={loading}
          className="
            w-full py-4 rounded-lg border font-mono font-medium
            transition-all duration-200 flex items-center justify-center space-x-2
            border-neon-green text-neon-green hover:bg-neon-green hover:text-cyber-black
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Generating Report...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Generate & Export Report</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Quick Export Presets */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-cyber-gray">Quick Export:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'JSON All', format: 'json', template: 'detailed_analysis' },
            { label: 'CSV Entities', format: 'csv', template: 'custom' },
            { label: 'HTML Report', format: 'html', template: 'executive_summary' }
          ].map((preset, index) => (
            <motion.button
              key={index}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedFormat(preset.format);
                setSelectedTemplate(preset.template);
                handleExport();
              }}
              className="
                px-3 py-2 text-xs font-mono rounded border border-cyber-border
                bg-cyber-light text-cyber-gray hover:text-neon-green hover:border-neon-green
                transition-colors
              "
              disabled={loading}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ExportPanel;
