import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, File, X, Check, AlertCircle, Loader,
  Image, FileText, Film, Music, Archive, FileCode
} from 'lucide-react';

export default function FileUpload({ onUpload, apiService, maxSize = 10485760, acceptedTypes = null }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // File type icons
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-5 h-5" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5" />;
    if (type.includes('javascript') || type.includes('json')) return <FileCode className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Validate file
  const validateFile = (file) => {
    const errors = [];

    // Check size
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
    }

    // Check type
    if (acceptedTypes && !acceptedTypes.includes(file.type)) {
      errors.push('File type not supported');
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name too long');
    }

    return errors;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    const validatedFiles = fileArray.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      errors: validateFile(file)
    }));

    setFiles(prev => [...prev, ...validatedFiles]);
  }, [maxSize, acceptedTypes]);

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Remove file
  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  // Upload single file
  const uploadFile = async (fileData) => {
    const { file, id } = fileData;

    try {
      setUploadProgress(prev => ({ ...prev, [id]: 0 }));

      // Simulate progress (in real app, use XMLHttpRequest or fetch with progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[id] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [id]: current + 10 };
        });
      }, 200);

      // Upload file
      const result = await apiService.uploadFile(file, {
        uploadedBy: 'current_user',
        category: 'form_attachment'
      });

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [id]: 100 }));

      return result.data;
    } catch (error) {
      setErrors(prev => ({ ...prev, [id]: error.message }));
      throw error;
    }
  };

  // Upload all files
  const handleUploadAll = async () => {
    const validFiles = files.filter(f => f.errors.length === 0);
    
    if (validFiles.length === 0) {
      alert('No valid files to upload');
      return;
    }

    try {
      const uploadPromises = validFiles.map(fileData => uploadFile(fileData));
      const results = await Promise.all(uploadPromises);
      
      if (onUpload) {
        onUpload(results);
      }

      // Clear successful uploads
      setFiles(prev => prev.filter(f => errors[f.id]));
      
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          accept={acceptedTypes?.join(',')}
          className="hidden"
        />

        <Upload className={`w-12 h-12 mx-auto mb-4 ${
          isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'
        }`} />

        <h3 className="text-lg font-semibold mb-2">
          {isDragging ? 'Drop files here' : 'Upload Files'}
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop files here, or click to browse
        </p>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span>Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB</span>
          {acceptedTypes && (
            <>
              <span>•</span>
              <span>Accepted: {acceptedTypes.map(t => t.split('/')[1]).join(', ')}</span>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Selected Files ({files.length})</h4>
            <button
              onClick={handleUploadAll}
              disabled={files.every(f => f.errors.length > 0)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((fileData) => {
              const progress = uploadProgress[fileData.id] || 0;
              const error = errors[fileData.id];
              const hasErrors = fileData.errors.length > 0;

              return (
                <div
                  key={fileData.id}
                  className={`p-4 rounded-lg border ${
                    hasErrors || error
                      ? 'border-destructive/50 bg-destructive/5'
                      : progress === 100
                      ? 'border-success/50 bg-success/5'
                      : 'border-border bg-card'
                  } transition-all animate-slide-down`}
                >
                  <div className="flex items-start gap-3">
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {fileData.preview ? (
                        <img
                          src={fileData.preview}
                          alt={fileData.file.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground">
                          {getFileIcon(fileData.file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{fileData.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(fileData.file.size)}
                          </p>
                        </div>

                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {progress === 100 ? (
                            <Check className="w-5 h-5 text-success" />
                          ) : progress > 0 ? (
                            <Loader className="w-5 h-5 animate-spin text-primary" />
                          ) : hasErrors || error ? (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <button
                              onClick={() => removeFile(fileData.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {progress > 0 && progress < 100 && (
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      {/* Errors */}
                      {(hasErrors || error) && (
                        <div className="mt-2 space-y-1">
                          {fileData.errors.map((err, idx) => (
                            <p key={idx} className="text-xs text-destructive flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {err}
                            </p>
                          ))}
                          {error && (
                            <p className="text-xs text-destructive flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {error}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Success Message */}
                      {progress === 100 && (
                        <p className="text-xs text-success mt-1">Upload complete!</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
