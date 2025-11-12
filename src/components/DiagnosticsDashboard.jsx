import React, { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, TrendingDown, Shield,
  Database, CheckCircle, AlertTriangle, XCircle,
  BarChart3, Play, RefreshCw, Download, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import SyncSimulator from '../engine/syncSimulator.js';
import * as db from '../db/storage.js';

export default function DiagnosticsDashboard({ orchestrator }) {
  const [stats, setStats] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allEntries, setAllEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const loadStats = async () => {
    const validationStats = await orchestrator.getValidationStats();
    setStats(validationStats);
    
    // Load all entries to show actual data
    const [entries, quarantined, validated] = await Promise.all([
      db.getAllEntries(),
      db.getAllQuarantined(),
      db.getAllValidated()
    ]);
    
    const combined = [
      ...entries.map(e => ({ ...e, source: 'staging' })),
      ...quarantined.map(e => ({ ...e, source: 'quarantine' })),
      ...validated.map(e => ({ ...e, source: 'validated' }))
    ];
    
    setAllEntries(combined);
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const simulator = new SyncSimulator();
      const results = await simulator.runSimulation();
      setSimulationResults(results);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
  };

  const COLORS = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    primary: '#8b5cf6'
  };

  // Prepare chart data
  const statusDistributionData = stats ? [
    { name: 'Staging', value: stats.staging, color: COLORS.warning },
    { name: 'Quarantined', value: stats.quarantined, color: COLORS.error },
    { name: 'Validated', value: stats.validated, color: COLORS.success }
  ] : [];

  const comparisonData = simulationResults ? [
    {
      name: 'Conflicts',
      baseline: simulationResults.baseline.conflicts,
      prototype: simulationResults.prototype.conflicts
    },
    {
      name: 'Corruptions',
      baseline: simulationResults.baseline.corruptions,
      prototype: simulationResults.prototype.corruptions
    },
    {
      name: 'Duplicates',
      baseline: simulationResults.baseline.duplicates,
      prototype: simulationResults.prototype.duplicates
    },
    {
      name: 'Successful',
      baseline: simulationResults.baseline.successful,
      prototype: simulationResults.prototype.successful
    }
  ] : [];

  // State for pie chart interactions
  const [activePieIndex, setActivePieIndex] = useState(null);

  // Custom 3D Pie Chart Label - Outside with lines
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const isActive = activePieIndex === index;
    const textColor = isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))';

    return (
      <g>
        {/* Label text */}
        <text
          x={x}
          y={y}
          fill={textColor}
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          className="font-bold text-sm pointer-events-none"
          style={{ 
            fontSize: isActive ? '15px' : '13px',
            transition: 'all 0.3s ease'
          }}
        >
          <tspan>{name}</tspan>
        </text>
        {/* Value text */}
        <text
          x={x}
          y={y + 16}
          fill={textColor}
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          className="font-semibold text-xs pointer-events-none"
          style={{ 
            fontSize: isActive ? '13px' : '12px',
            transition: 'all 0.3s ease'
          }}
        >
          <tspan>{value} ({(percent * 100).toFixed(1)}%)</tspan>
        </text>
      </g>
    );
  };

  // Custom active shape for hover effect
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: 'drop-shadow(0px 6px 12px rgba(0, 0, 0, 0.4))',
            transition: 'all 0.3s ease'
          }}
        />
      </g>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Diagnostics Dashboard</h2>
          </div>
          <p className="text-muted-foreground">
            Real-time metrics and sync simulation results
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Entries */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-primary" />
              <span className="text-3xl font-bold">{stats.totalEntries}</span>
            </div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </div>

          {/* Validated */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-success" />
              <span className="text-3xl font-bold">{stats.validated}</span>
            </div>
            <div className="text-sm text-muted-foreground">Validated</div>
            <div className="mt-2 text-xs text-success">
              {((stats.validated / stats.totalEntries * 100) || 0).toFixed(1)}% of total
            </div>
          </div>

          {/* Quarantined */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-warning" />
              <span className="text-3xl font-bold">{stats.quarantined}</span>
            </div>
            <div className="text-sm text-muted-foreground">Quarantined</div>
            <div className="mt-2 text-xs text-warning">
              {(stats.quarantineRate * 100).toFixed(1)}% quarantine rate
            </div>
          </div>

          {/* Correction Rate */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold">
                {(stats.correctionRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Correction Rate</div>
            <div className="mt-2 text-xs text-blue-500">
              Quarantined items corrected
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 3D Interactive Pie Chart - Status Distribution */}
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Entry Status Distribution
              <span className="text-xs text-muted-foreground font-normal">(Hover to interact)</span>
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  activeIndex={activePieIndex}
                  activeShape={renderActiveShape}
                  data={statusDistributionData}
                  cx="50%"
                  cy="40%"
                  labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }}
                  label={renderCustomLabel}
                  outerRadius={90}
                  innerRadius={45}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={3}
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        filter: activePieIndex === index 
                          ? 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.5))' 
                          : 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.3))',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border-2 border-border rounded-lg p-3 shadow-xl">
                          <p className="font-semibold text-base mb-1">{payload[0].name}</p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Count: </span>
                            <span className="font-bold text-lg">{payload[0].value}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((payload[0].value / stats.totalEntries) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4">
              {statusDistributionData.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                >
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className={`text-sm font-medium ${activePieIndex === index ? 'text-primary' : 'text-foreground'}`}>
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Entry Data Table */}
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-lg font-semibold mb-4">Recent Entries Data</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {allEntries.slice(0, 10).map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer flex items-center justify-between"
                  onClick={() => handleViewEntry(entry)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {entry.data?.firstName || entry.data?.name || entry.data?.email || 'Entry #' + entry.id}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        entry.source === 'validated' ? 'bg-success/20 text-success' :
                        entry.source === 'quarantine' ? 'bg-destructive/20 text-destructive' :
                        'bg-warning/20 text-warning'
                      }`}>
                        {entry.source}
                      </span>
                      {entry.confidence && (
                        <span>Confidence: {(entry.confidence.score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              ))}
              {allEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entries yet. Create some entries to see data here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Simulator */}
      <div className="p-6 rounded-lg border border-border bg-card mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-1">Sync Conflict Simulator</h3>
            <p className="text-sm text-muted-foreground">
              Compare sync outcomes with and without local validation
            </p>
          </div>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Simulation
              </>
            )}
          </button>
        </div>

        {simulationResults && (
          <div className="space-y-6 animate-fade-in">
            {/* Improvements Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-success" />
                  <span className="font-semibold">Conflict Reduction</span>
                </div>
                <div className="text-3xl font-bold text-success">
                  {simulationResults.improvements.conflictReduction.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-success" />
                  <span className="font-semibold">Corruption Reduction</span>
                </div>
                <div className="text-3xl font-bold text-success">
                  {simulationResults.improvements.corruptionReduction.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Success Rate Improvement</span>
                </div>
                <div className="text-3xl font-bold text-primary">
                  +{simulationResults.improvements.successRateImprovement.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Comparison Chart */}
            <div>
              <h4 className="font-semibold mb-4">Baseline vs Prototype Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="baseline" fill={COLORS.error} name="Without Validation" />
                  <Bar dataKey="prototype" fill={COLORS.success} name="With Validation" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3 text-sm">Baseline (No Validation)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Attempted:</span>
                    <span className="font-semibold">{simulationResults.baseline.totalAttempted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-semibold text-success">{simulationResults.baseline.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conflicts:</span>
                    <span className="font-semibold text-warning">{simulationResults.baseline.conflicts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Corruptions:</span>
                    <span className="font-semibold text-destructive">{simulationResults.baseline.corruptions}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Success Rate:</span>
                    <span className="font-semibold">{(simulationResults.baseline.successRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <h4 className="font-semibold mb-3 text-sm">Prototype (With Validation)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Attempted:</span>
                    <span className="font-semibold">{simulationResults.prototype.totalAttempted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-semibold text-success">{simulationResults.prototype.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conflicts:</span>
                    <span className="font-semibold text-warning">{simulationResults.prototype.conflicts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quarantined:</span>
                    <span className="font-semibold text-warning">{simulationResults.prototype.quarantined}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Success Rate:</span>
                    <span className="font-semibold text-success">{(simulationResults.prototype.successRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Insights
              </h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>
                    Local validation prevented <strong>{simulationResults.improvements.totalIssuesReduced}</strong> sync issues
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>
                    <strong>{simulationResults.improvements.quarantinedPreventedIssues}</strong> problematic entries quarantined before sync attempt
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>
                    Success rate improved by <strong>{simulationResults.improvements.successRateImprovement.toFixed(1)}%</strong>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            className="bg-card rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-xl font-semibold">Entry Details</h3>
                <p className="text-sm text-muted-foreground">ID: #{selectedEntry.id}</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin">
              {/* Status and Confidence */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className={`text-lg font-semibold capitalize ${
                    selectedEntry.source === 'validated' ? 'text-success' :
                    selectedEntry.source === 'quarantine' ? 'text-destructive' :
                    'text-warning'
                  }`}>
                    {selectedEntry.source}
                  </div>
                </div>
                {selectedEntry.confidence && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Confidence Score</div>
                    <div className="text-lg font-semibold text-primary">
                      {(selectedEntry.confidence.score * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Entry Data */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Form Data</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEntry.data && Object.entries(selectedEntry.data).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="font-medium">{value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON View */}
              <div>
                <h4 className="font-semibold mb-3">Complete Data (JSON)</h4>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto scrollbar-thin">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
