import React, { useState, useEffect } from 'react';
import { 
  History, Undo, Filter, Search, Calendar,
  User, Activity, CheckCircle, AlertCircle, Edit, Database
} from 'lucide-react';
import * as db from '../db/storage.js';

export default function AuditTrail({ orchestrator }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryLogs, setEntryLogs] = useState([]);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, filterAction, searchTerm]);

  const loadAuditLogs = async () => {
    const logs = await db.getAllAuditLogs();
    setAuditLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
  };

  const filterLogs = () => {
    let filtered = auditLogs;

    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.entryId.toString().includes(searchTerm) ||
        log.action.includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.data || {}).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const loadEntryHistory = async (entryId) => {
    const logs = await db.getAuditLogForEntry(entryId);
    setEntryLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
    setSelectedEntry(entryId);
  };

  const handleUndo = async (log) => {
    if (window.confirm('Are you sure you want to undo this change?')) {
      try {
        await orchestrator.undoChanges(log.entryId, 1);
        await loadAuditLogs();
        alert('Change undone successfully');
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return <Database className="w-4 h-4 text-success" />;
      case 'revalidated':
        return <Edit className="w-4 h-4 text-primary" />;
      case 'corrected':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'quarantined':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'bg-success/10 text-success border-success/30';
      case 'revalidated':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'corrected':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'quarantined':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'validated':
        return 'bg-success/10 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Audit Trail</h2>
        </div>
        <p className="text-muted-foreground">
          Complete history of all entry changes and validations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Actions</option>
            <option value="created">Created</option>
            <option value="corrected">Corrected</option>
            <option value="revalidated">Revalidated</option>
            <option value="quarantined">Quarantined</option>
            <option value="validated">Validated</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold">{auditLogs.length}</div>
          <div className="text-sm text-muted-foreground">Total Logs</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold">
            {auditLogs.filter(l => l.action === 'created').length}
          </div>
          <div className="text-sm text-muted-foreground">Entries Created</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {auditLogs.filter(l => l.action === 'corrected').length}
          </div>
          <div className="text-sm text-muted-foreground">Corrections Made</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold">
            {new Set(auditLogs.map(l => l.entryId)).size}
          </div>
          <div className="text-sm text-muted-foreground">Unique Entries</div>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all animate-fade-in"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Entry #{log.entryId}
                    </span>
                    {log.confidence && (
                      <span className="text-sm text-muted-foreground">
                        • Confidence: {(log.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.deviceId?.slice(0, 12)}...
                    </div>
                  </div>

                  {/* Changes */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                      <div className="font-medium mb-1">Changes:</div>
                      <div className="space-y-1">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Preview */}
                  {log.data && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {Object.entries(log.data).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          {key}: <strong>{value}</strong>
                        </span>
                      ))}
                      {Object.keys(log.data).length > 3 && (
                        <span>...{Object.keys(log.data).length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => loadEntryHistory(log.entryId)}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title="View entry history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  {log.action === 'revalidated' && (
                    <button
                      onClick={() => handleUndo(log)}
                      className="p-2 rounded hover:bg-muted transition-colors"
                      title="Undo this change"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Entry History Modal */}
      {selectedEntry && entryLogs.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => {
            setSelectedEntry(null);
            setEntryLogs([]);
          }}
        >
          <div 
            className="bg-card rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    Entry #{selectedEntry} History
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete timeline of changes
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntry(null);
                    setEntryLogs([]);
                  }}
                  className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Close"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin">
              <div className="space-y-6">
                {entryLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="relative pl-10 pb-6 border-l-2 border-primary/30 last:border-l-0 last:pb-0"
                  >
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary border-4 border-card shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.action)}`}>
                          {log.action.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="bg-card rounded-md p-3 border border-border">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">CHANGES:</div>
                          <div className="space-y-1">
                            {Object.entries(log.changes).map(([key, value]) => (
                              <div key={key} className="text-sm flex items-start gap-2">
                                <span className="font-semibold text-primary min-w-[100px]">{key}:</span>
                                <span className="text-foreground flex-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.data && (
                        <div className="mt-3 text-xs">
                          <span className="text-muted-foreground">Data: </span>
                          <span className="text-foreground font-mono">
                            {JSON.stringify(log.data).slice(0, 100)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {entryLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No history found for this entry</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
