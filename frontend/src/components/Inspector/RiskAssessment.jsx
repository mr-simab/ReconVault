// Risk Assessment Visualizer Component
import React from 'react';
import { motion } from 'framer-motion';
import { RiskBadge } from '../Common/Badge';
import { formatRiskScore } from '../../utils/formatters';

const RiskAssessment = ({
  riskScore = 0,
  riskLevel = 'INFO',
  riskFactors = [],
  mitigations = [],
  trends = [],
  className = ''
}) => {
  const getRiskLevelConfig = (level) => {
    const configs = {
      CRITICAL: { 
        color: 'text-danger-red', 
        bgColor: 'bg-danger-red',
        glowColor: 'shadow-glow-red',
        icon: '🚨'
      },
      HIGH: { 
        color: 'text-neon-orange', 
        bgColor: 'bg-neon-orange',
        glowColor: 'shadow-glow-orange',
        icon: '⚠️'
      },
      MEDIUM: { 
        color: 'text-warning-yellow', 
        bgColor: 'bg-warning-yellow',
        glowColor: 'shadow-glow-yellow',
        icon: '⚡'
      },
      LOW: { 
        color: 'text-safe-green', 
        bgColor: 'bg-safe-green',
        glowColor: 'shadow-glow-green',
        icon: 'ℹ️'
      },
      INFO: { 
        color: 'text-neon-cyan', 
        bgColor: 'bg-neon-cyan',
        glowColor: 'shadow-glow-cyan',
        icon: 'ℹ️'
      }
    };
    return configs[level] || configs.INFO;
  };

  const config = getRiskLevelConfig(riskLevel);

  // Risk score gauge component
  const RiskGauge = () => {
    const percentage = (riskScore || 0) * 100;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgba(58, 63, 90, 0.3)"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={config.color}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center"
          >
            <div className="text-2xl font-bold font-mono text-neon-green">
              {formatRiskScore(riskScore)}%
            </div>
            <div className="text-xs text-cyber-gray">
              Risk Score
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  // Risk factor item component
  const RiskFactorItem = ({ factor, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 bg-cyber-dark rounded-lg border border-cyber-border"
    >
      <div className="flex-shrink-0 mt-1">
        <span className="text-sm">
          {factor.severity === 'critical' ? '🚨' :
           factor.severity === 'high' ? '⚠️' :
           factor.severity === 'medium' ? '⚡' : 'ℹ️'}
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs font-medium text-neon-cyan">
            {factor.type || 'General'}
          </span>
          <span className={`
            text-xs px-2 py-1 rounded font-mono
            ${factor.severity === 'critical' ? 'bg-danger-red text-white' :
              factor.severity === 'high' ? 'bg-neon-orange text-cyber-black' :
              factor.severity === 'medium' ? 'bg-warning-yellow text-cyber-black' :
              'bg-neon-cyan text-cyber-black'
            }
          `}>
            {factor.severity?.toUpperCase() || 'INFO'}
          </span>
        </div>
        
        <p className="text-xs text-cyber-gray">
          {factor.description || factor}
        </p>
        
        {factor.impact && (
          <div className="mt-2">
            <div className="text-xs text-cyber-gray mb-1">Impact:</div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-2 h-2 rounded-full ${
                    level <= factor.impact ? config.bgColor : 'bg-cyber-border'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Mitigation item component
  const MitigationItem = ({ mitigation, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 bg-cyber-dark rounded-lg border border-safe-green"
    >
      <div className="flex-shrink-0 mt-1">
        <span className="text-sm">✅</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-safe-green mb-1">
          {mitigation.title || mitigation}
        </div>
        
        {mitigation.description && (
          <p className="text-xs text-cyber-gray">
            {mitigation.description}
          </p>
        )}
        
        {mitigation.priority && (
          <div className="mt-2">
            <span className="text-xs text-cyber-gray">Priority: </span>
            <span className={`text-xs font-mono ${
              mitigation.priority === 'high' ? 'text-danger-red' :
              mitigation.priority === 'medium' ? 'text-warning-yellow' :
              'text-safe-green'
            }`}>
              {mitigation.priority.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Risk trend chart component
  const RiskTrendChart = () => {
    if (!trends || trends.length === 0) {
      return (
        <div className="h-24 bg-cyber-dark rounded-lg border border-cyber-border flex items-center justify-center">
          <div className="text-center text-cyber-gray">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs">No trend data available</div>
          </div>
        </div>
      );
    }

    const maxScore = Math.max(...trends.map(t => t.score || 0));
    const minScore = Math.min(...trends.map(t => t.score || 0));

    return (
      <div className="h-24 bg-cyber-dark rounded-lg border border-cyber-border p-2">
        <div className="flex items-end space-x-1 h-full">
          {trends.map((trend, index) => {
            const height = maxScore > minScore ? 
              ((trend.score - minScore) / (maxScore - minScore)) * 100 : 50;
            
            return (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: index * 0.1 }}
                className={`flex-1 ${config.bgColor} rounded-t opacity-80`}
                title={`${trend.date}: ${formatRiskScore(trend.score)}%`}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between text-xs text-cyber-gray mt-1">
          <span>{trends[0]?.date || ''}</span>
          <span>{trends[trends.length - 1]?.date || ''}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Risk Score Display */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            inline-flex items-center space-x-2 px-4 py-2 rounded-lg border
            ${config.color} ${config.bgColor} bg-opacity-10 ${config.glowColor}
          `}
        >
          <span className="text-lg">{config.icon}</span>
          <span className="font-cyber text-lg font-bold">
            {riskLevel}
          </span>
          <RiskBadge level={riskLevel} score={riskScore} size="sm" />
        </motion.div>
        
        <div className="mt-4">
          <RiskGauge />
        </div>
      </div>

      {/* Risk Factors */}
      {riskFactors && riskFactors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neon-green flex items-center space-x-2">
            <span>⚠️</span>
            <span>Risk Factors ({riskFactors.length})</span>
          </h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto scrollable-cyber">
            {riskFactors.map((factor, index) => (
              <RiskFactorItem key={index} factor={factor} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Risk Trend */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neon-green flex items-center space-x-2">
          <span>📈</span>
          <span>Risk Trend</span>
        </h4>
        
        <RiskTrendChart />
      </div>

      {/* Mitigations */}
      {mitigations && mitigations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neon-green flex items-center space-x-2">
            <span>🛡️</span>
            <span>Recommended Mitigations ({mitigations.length})</span>
          </h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto scrollable-cyber">
            {mitigations.map((mitigation, index) => (
              <MitigationItem key={index} mitigation={mitigation} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment Summary */}
      <div className="p-4 bg-cyber-light bg-opacity-30 rounded-lg border border-cyber-border">
        <h4 className="text-sm font-medium text-neon-green mb-3">Assessment Summary</h4>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-cyber-gray">Overall Risk:</span>
            <span className={config.color}>
              {riskLevel} ({formatRiskScore(riskScore)}%)
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-cyber-gray">Risk Factors:</span>
            <span className="text-neon-cyan">
              {riskFactors ? riskFactors.length : 0} identified
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-cyber-gray">Mitigations:</span>
            <span className="text-safe-green">
              {mitigations ? mitigations.length : 0} available
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-cyber-gray">Trend:</span>
            <span className="text-neon-purple">
              {trends && trends.length > 1 ? 
                (trends[trends.length - 1].score > trends[0].score ? 'Increasing' : 'Decreasing') :
                'Stable'
              }
            </span>
          </div>
        </div>
        
        {/* Action Recommendations */}
        <div className="mt-4 pt-3 border-t border-cyber-border">
          <div className="text-xs text-cyber-gray mb-2">Recommended Actions:</div>
          <div className="space-y-1">
            {riskLevel === 'CRITICAL' && (
              <div className="text-xs text-danger-red">• Immediate investigation required</div>
            )}
            {riskLevel === 'HIGH' && (
              <div className="text-xs text-neon-orange">• Priority review recommended</div>
            )}
            {riskLevel === 'MEDIUM' && (
              <div className="text-xs text-warning-yellow">• Monitor closely</div>
            )}
            {(riskLevel === 'LOW' || riskLevel === 'INFO') && (
              <div className="text-xs text-safe-green">• Standard monitoring</div>
            )}
            
            {riskFactors && riskFactors.length > 0 && (
              <div className="text-xs text-neon-cyan">• Review and address risk factors</div>
            )}
            
            {mitigations && mitigations.length > 0 && (
              <div className="text-xs text-neon-cyan">• Implement recommended mitigations</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;