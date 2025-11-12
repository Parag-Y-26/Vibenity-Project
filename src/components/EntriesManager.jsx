import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Search, Filter, Download,
  Eye, RefreshCw, CheckCircle, AlertCircle, XCircle, AlertTriangle, Save
} from 'lucide-react';
import * as db from '../db/storage.js';
import FileUpload from './FileUpload.jsx';

export default function EntriesManager({ apiService }) {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterAndSearchEntries();
  }, [entries, searchTerm, filterStatus]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const [allEntries, quarantined, validated] = await Promise.all([
        db.getAllEntries(),
        db.getAllQuarantined(),
        db.getAllValidated()
      ]);

      const combined = [
        ...allEntries.map(e => ({ ...e, source: 'staging' })),
        ...quarantined.map(e => ({ ...e, source: 'quarantine' })),
        ...validated.map(e => ({ ...e, source: 'validated' }))
      ];

      setEntries(combined);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSearchEntries = () => {
    let filtered = entries;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.source === filterStatus);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(e =>
        JSON.stringify(e.data || {}).toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id.toString().includes(searchTerm)
      );
    }

    setFilteredEntries(filtered);
  };

  const handleView = (entry) => {
    setSelectedEntry(entry);
  };

  const [editFormData, setEditFormData] = useState({});
  const [newEntryData, setNewEntryData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    zipCode: ''
  });

  const handleNewEntryChange = (fieldName, value) => {
    setNewEntryData(prev => ({ ...prev, [fieldName]: value }));
  };

  const saveNewEntry = async () => {
    try {
      // Validate required fields
      if (!newEntryData.firstName || !newEntryData.lastName || !newEntryData.email) {
        alert('Please fill required fields: First Name, Last Name, and Email');
        return;
      }

      const entry = {
        data: newEntryData,
        metadata: {
          createdAt: new Date().toISOString(),
          deviceId: localStorage.getItem('deviceId') || 'web-device'
        }
      };

      await db.addEntry(entry);
      await loadEntries();
      setShowCreateModal(false);
      setNewEntryData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        city: '',
        zipCode: ''
      });
      alert('Entry created successfully!');
    } catch (error) {
      console.error('Create error:', error);
      alert('Failed to create entry: ' + error.message);
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setEditFormData(entry.data || {});
    setShowEditModal(true);
  };

  const handleEditFieldChange = (fieldName, value) => {
    setEditFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const saveEdit = async () => {
    if (!selectedEntry) return;

    try {
      // Calculate what changed
      const changes = {};
      Object.keys(editFormData).forEach(key => {
        if (editFormData[key] !== selectedEntry.data[key]) {
          changes[key] = `${selectedEntry.data[key]} → ${editFormData[key]}`;
        }
      });

      // Update the entry data
      const updatedEntry = {
        ...selectedEntry,
        data: editFormData,
        metadata: {
          ...selectedEntry.metadata,
          lastModified: new Date().toISOString()
        }
      };

      // Save to appropriate store
      if (selectedEntry.source === 'validated') {
        await db.updateValidated(selectedEntry.id, updatedEntry);
      } else if (selectedEntry.source === 'quarantine') {
        await db.updateQuarantined(selectedEntry.id, updatedEntry);
      } else {
        await db.updateEntry(selectedEntry.id, updatedEntry);
      }

      // Log correction to audit trail
      await db.addAuditLog({
        entryId: selectedEntry.id,
        action: 'corrected',
        status: selectedEntry.source,
        confidence: selectedEntry.confidence?.score || 0,
        deviceId: localStorage.getItem('deviceId') || 'web-device',
        changes: changes,
        data: editFormData,
        metadata: {
          correctedAt: new Date().toISOString(),
          correctedBy: 'manual-edit'
        }
      });

      await loadEntries();
      setShowEditModal(false);
      setSelectedEntry(null);
      setEditFormData({});
      alert('Entry updated successfully! Correction logged to audit trail.');
    } catch (error) {
      console.error('Edit error:', error);
      alert('Update failed: ' + error.message);
    }
  };

  const handleDelete = (entry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedEntry) return;

    try {
      // Delete from the correct store based on source
      if (selectedEntry.source === 'validated') {
        await db.deleteValidated(selectedEntry.id);
      } else if (selectedEntry.source === 'quarantine') {
        await db.deleteQuarantined(selectedEntry.id);
      } else {
        await db.deleteEntry(selectedEntry.id);
      }
      
      await loadEntries();
      setShowDeleteModal(false);
      setSelectedEntry(null);
      alert('Entry deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + error.message);
    }
  };

  const handleValidate = async (entry) => {
    if (entry.source === 'validated') {
      alert('Entry is already validated!');
      return;
    }

    const confirmed = window.confirm(
      `Validate this entry?\n\nEntry ID: ${entry.id}\nCurrent Status: ${entry.source}\n\nThis will mark the entry as validated and move it to the validated store.`
    );

    if (!confirmed) return;

    try {
      // Update entry with validated status
      const validatedEntry = {
        ...entry,
        source: 'validated',
        confidence: {
          ...entry.confidence,
          status: 'validated',
          score: entry.confidence?.score || 0.95
        },
        metadata: {
          ...entry.metadata,
          validatedAt: new Date().toISOString(),
          validatedBy: 'admin'
        }
      };

      // Delete from old store
      if (entry.source === 'quarantine') {
        await db.deleteQuarantined(entry.id);
      } else {
        await db.deleteEntry(entry.id);
      }

      // Add to validated store
      await db.moveToValidated(validatedEntry);

      // Log validation to audit trail
      await db.addAuditLog({
        entryId: entry.id,
        action: 'validated',
        status: 'validated',
        confidence: validatedEntry.confidence.score,
        deviceId: localStorage.getItem('deviceId') || 'web-device',
        changes: {
          status: `${entry.source} → validated`,
          validatedBy: 'admin-manual'
        },
        data: validatedEntry.data,
        metadata: {
          validatedAt: new Date().toISOString(),
          previousStatus: entry.source
        }
      });

      await loadEntries();
      alert('Entry validated successfully! Check Diagnostics for updated stats.');
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed: ' + error.message);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entries-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (source) => {
    switch (source) {
      case 'validated':
        return 'bg-success/10 text-success border-success/30';
      case 'quarantine':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-warning/10 text-warning border-warning/30';
    }
  };

  const getStatusIcon = (source) => {
    switch (source) {
      case 'validated':
        return <CheckCircle className="w-4 h-4" />;
      case 'quarantine':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Entries Management</h2>
          <p className="text-muted-foreground">Full CRUD operations for all entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Files
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="staging">Staging</option>
              <option value="validated">Validated</option>
              <option value="quarantine">Quarantined</option>
            </select>
          </div>

          <button
            onClick={loadEntries}
            disabled={isLoading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold">{entries.length}</div>
          <div className="text-sm text-muted-foreground">Total Entries</div>
        </div>
        <div className="p-4 rounded-lg bg-success/10 border border-success/30">
          <div className="text-2xl font-bold text-success">
            {entries.filter(e => e.source === 'validated').length}
          </div>
          <div className="text-sm text-muted-foreground">Validated</div>
        </div>
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
          <div className="text-2xl font-bold text-warning">
            {entries.filter(e => e.source === 'staging').length}
          </div>
          <div className="text-sm text-muted-foreground">Staging</div>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="text-2xl font-bold text-destructive">
            {entries.filter(e => e.source === 'quarantine').length}
          </div>
          <div className="text-sm text-muted-foreground">Quarantined</div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Data</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Confidence</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                    {isLoading ? 'Loading entries...' : 'No entries found'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">#{entry.id}</td>
                    <td className="px-4 py-3 text-sm max-w-xs">
                      <div className="truncate">
                        {entry.data?.firstName || entry.data?.name || entry.data?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(entry.source)}`}>
                        {getStatusIcon(entry.source)}
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.confidence ? (
                        <span className={`font-semibold ${
                          entry.confidence.score >= 0.7 ? 'text-success' :
                          entry.confidence.score >= 0.4 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {(entry.confidence.score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(entry.createdAt || entry.metadata?.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(entry)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {entry.source !== 'validated' && (
                          <button
                            onClick={() => handleValidate(entry)}
                            className="p-2 hover:bg-success/10 text-success rounded transition-colors border border-transparent hover:border-success/30"
                            title="Validate Entry"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedEntry && !showEditModal && !showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            className="bg-card rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-2 border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-2xl font-bold">Entry Details</h3>
                <p className="text-sm text-muted-foreground mt-1">ID: #{selectedEntry.id}</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors border-2 border-transparent hover:border-destructive"
                title="Close"
              >
                <span className="text-3xl font-bold">✕</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin">
              {/* Status and Confidence Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">STATUS</div>
                  <div className={`text-lg font-bold capitalize ${
                    selectedEntry.source === 'validated' ? 'text-green-600' :
                    selectedEntry.source === 'quarantine' ? 'text-red-600' :
                    'text-orange-600'
                  }`}>
                    {selectedEntry.source}
                  </div>
                </div>
                {selectedEntry.confidence && (
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">CONFIDENCE</div>
                    <div className="text-lg font-bold text-primary">
                      {(selectedEntry.confidence.score * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Form Data */}
              {selectedEntry.data && (
                <div className="mb-6">
                  <h4 className="font-bold text-lg mb-3 text-foreground">Form Data</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedEntry.data).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="font-medium text-foreground">{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON View */}
              <div>
                <h4 className="font-bold text-lg mb-3 text-foreground">Complete Data (JSON)</h4>
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-green-400 p-4 rounded-lg overflow-x-auto border border-border font-mono">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
            setEditFormData({});
          }}
        >
          <div 
            className="bg-card rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-2 border-primary/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Edit Entry</h3>
                <p className="text-sm text-muted-foreground mt-1">ID: #{selectedEntry.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEntry(null);
                  setEditFormData({});
                }}
                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors border-2 border-transparent hover:border-destructive"
                title="Close"
              >
                <span className="text-3xl font-bold">✕</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin">
              <div className="space-y-4">
                {Object.keys(editFormData).map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground uppercase">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type="text"
                      value={editFormData[key] || ''}
                      onChange={(e) => handleEditFieldChange(key, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t-2 border-border">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEntry(null);
                    setEditFormData({});
                  }}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-base shadow-lg flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedEntry(null);
          }}
        >
          <div 
            className="bg-card rounded-xl max-w-md w-full p-8 shadow-2xl border-2 border-destructive/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Confirm Delete</h3>
            </div>
            <p className="text-base text-foreground mb-2">
              Are you sure you want to delete this entry?
            </p>
            <div className="bg-muted/50 rounded-lg p-3 mb-6 border border-border">
              <div className="text-sm text-muted-foreground">Entry ID:</div>
              <div className="text-lg font-bold text-foreground">#{selectedEntry.id}</div>
              <div className="text-sm text-muted-foreground mt-2">Status:</div>
              <div className="text-base font-semibold text-foreground capitalize">{selectedEntry.source}</div>
            </div>
            <p className="text-sm text-destructive font-medium mb-6">
              ⚠️ This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEntry(null);
                }}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-base"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors font-medium text-base shadow-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Upload Files</h3>
                <p className="text-sm text-muted-foreground mt-1">Drag and drop or click to browse</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors border-2 border-transparent hover:border-destructive"
                title="Close"
              >
                <span className="text-3xl font-bold">✕</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin bg-muted/10">
              <FileUpload
                apiService={apiService}
                onUpload={(files) => {
                  console.log('Files uploaded:', files);
                  alert(`Successfully uploaded ${files.length} file(s)!`);
                  setShowUploadModal(false);
                }}
                maxSize={10485760}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create New Entry Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-primary/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Create New Entry</h3>
                <p className="text-sm text-muted-foreground mt-1">Fill in the entry details</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors border-2 border-transparent hover:border-destructive"
                title="Close"
              >
                <span className="text-3xl font-bold">✕</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">First Name *</label>
                  <input
                    type="text"
                    value={newEntryData.firstName}
                    onChange={(e) => handleNewEntryChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Last Name *</label>
                  <input
                    type="text"
                    value={newEntryData.lastName}
                    onChange={(e) => handleNewEntryChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Email *</label>
                  <input
                    type="email"
                    value={newEntryData.email}
                    onChange={(e) => handleNewEntryChange('email', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={newEntryData.phone}
                    onChange={(e) => handleNewEntryChange('phone', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Date of Birth</label>
                  <input
                    type="date"
                    value={newEntryData.dateOfBirth}
                    onChange={(e) => handleNewEntryChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Address</label>
                  <input
                    type="text"
                    value={newEntryData.address}
                    onChange={(e) => handleNewEntryChange('address', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="123, Street Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">City</label>
                  <input
                    type="text"
                    value={newEntryData.city}
                    onChange={(e) => handleNewEntryChange('city', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">PIN Code</label>
                  <input
                    type="text"
                    value={newEntryData.zipCode}
                    onChange={(e) => handleNewEntryChange('zipCode', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base"
                    placeholder="400001"
                    maxLength="6"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t-2 border-border">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewEntry}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-base shadow-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
