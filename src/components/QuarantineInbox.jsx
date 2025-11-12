import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, XCircle, Edit, 
  Trash2, Eye, TrendingUp, Clock, Shield 
} from 'lucide-react';
import * as db from '../db/storage.js';

export default function QuarantineInbox({ orchestrator, onCorrect }) {
  const [quarantinedEntries, setQuarantinedEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    loadQuarantinedEntries();
  }, []);

  const loadQuarantinedEntries = async () => {
    const entries = await db.getAllQuarantined();
    setQuarantinedEntries(entries);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditedData(entry.data || {});
  };

  const handleSaveCorrection = async () => {
    if (!editingEntry) return;

    try {
      const updated = await orchestrator.revalidateEntry(editingEntry.id, editedData);
      await loadQuarantinedEntries();
      setEditingEntry(null);
      setEditedData({});
      onCorrect && onCorrect(updated);
    } catch (error) {
      console.error('Error correcting entry:', error);
    }
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await db.deleteEntry(entryId);
      await loadQuarantinedEntries();
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 border-destructive/50';
      case 'medium': return 'bg-warning/10 border-warning/50';
      case 'low': return 'bg-success/10 border-success/50';
      default: return 'bg-muted/10';
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return 'text-success';
    if (score >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-warning" />
          <h2 className="text-3xl font-bold">Quarantine Inbox</h2>
        </div>
        <p className="text-muted-foreground">
          Review and correct entries flagged by validation system
        </p>
      </div>

      {quarantinedEntries.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Quarantined Entries</h3>
          <p className="text-muted-foreground">All entries passed validation!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {quarantinedEntries.map((entry) => (
            <div
              key={entry.id}
              className={`p-6 rounded-lg border ${
                editingEntry?.id === entry.id 
                  ? 'border-primary' 
                  : 'border-border'
              } bg-card hover:shadow-lg transition-all animate-slide-up`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className={`w-6 h-6 ${getSeverityColor('high')}`} />
                    <h3 className="text-lg font-semibold">
                      Entry #{entry.id}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityBg('high')}`}>
                      Quarantined
                    </span>
                  </div>
                  
                  {/* Confidence Score */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Confidence: </span>
                      <span className={`font-semibold ${getConfidenceColor(entry.confidence?.score || 0)}`}>
                        {((entry.confidence?.score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(entry.quarantinedAt || entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {editingEntry?.id !== entry.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(entry)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveCorrection}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingEntry(null);
                          setEditedData({});
                        }}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Issues & Recommendations */}
              {entry.confidence?.recommendation && (
                <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Issues Found
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {entry.confidence.recommendation.issues?.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.confidence.recommendation.suggestions?.length > 0 && (
                    <>
                      <h4 className="font-semibold mt-3 mb-2 text-sm">Suggestions:</h4>
                      <ul className="space-y-1 text-sm">
                        {entry.confidence.recommendation.suggestions.map((sug, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-success">→</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* Anomaly Details */}
              {entry.anomalyDetection?.results && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-sm">Detected Anomalies:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(entry.anomalyDetection.results).map(([field, result]) => {
                      if (result.anomalies.length === 0) return null;
                      return (
                        <div key={field} className={`p-3 rounded-lg border text-sm ${getSeverityBg(result.severity)}`}>
                          <div className="font-medium mb-1">{field}</div>
                          {result.anomalies.map((anomaly, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              • {anomaly.message}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data Fields */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Entry Data:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(entry.data || {}).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {editingEntry?.id === entry.id ? (
                        <input
                          type="text"
                          value={editedData[key] || ''}
                          onChange={(e) => setEditedData(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <div className="px-3 py-2 rounded-lg bg-muted/50 text-sm">
                          {value || <span className="text-muted-foreground italic">Empty</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Behavior Analysis */}
              {entry.behaviorAnalysis?.report && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-semibold text-sm mb-2">Behavior Analysis:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {Object.entries(entry.behaviorAnalysis.report).map(([field, analysis]) => (
                      <div key={field} className={`p-2 rounded ${getSeverityBg(analysis.risk)}`}>
                        <div className="font-medium">{field}</div>
                        <div className={`${getSeverityColor(analysis.risk)} font-semibold`}>
                          Risk: {analysis.risk}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
