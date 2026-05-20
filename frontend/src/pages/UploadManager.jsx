import { useState, useEffect, useRef } from 'react';
import { uploadApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadManager() {
  const [file, setFile] = useState(null);
  const [toolName, setToolName] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await uploadApi.getHistory();
      setHistory(res.data);
    } catch (err) {
      console.error('History error:', err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (toolName) formData.append('toolName', toolName);
    if (month) formData.append('month', month);
    if (year) formData.append('year', year);

    try {
      const res = await uploadApi.uploadFile(formData);
      setResult(res.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Manager</h1>
        <p className="text-dark-400 mt-1">Upload inventory Excel files for compliance processing</p>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="bg-dark-800 rounded-xl border border-dark-700 p-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-dark-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-300 font-medium">
                Drop Excel file here or click to browse
              </p>
              <p className="text-sm text-dark-500 mt-1">
                Naming format: YYYY_MM_TOOL_Inventory.xlsx
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Tool Name (optional if in filename)
            </label>
            <select
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
            >
              <option value="">Auto-detect</option>
              {['Cube', 'AD', 'DC', 'KES', 'DLP'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
            >
              <option value="">Auto-detect</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
            >
              <option value="">Auto-detect</option>
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="mt-4 w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Processing...' : 'Upload & Process'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Upload Successful</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-dark-300">
              <div>Tool: <span className="text-white">{result.toolName}</span></div>
              <div>Rows: <span className="text-white">{result.rowCount}</span></div>
              <div>Duplicates: <span className="text-white">{result.duplicateCount}</span></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </form>

      {/* Upload History */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upload History</h3>
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 bg-dark-900 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-white">{upload.original_name}</p>
                    <p className="text-xs text-dark-400">
                      {upload.tool_name} | {upload.month}/{upload.year} | {upload.row_count} rows
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-dark-400">
                    {new Date(upload.created_at).toLocaleDateString()}
                  </span>
                  <StatusBadge status={upload.status} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-dark-500 text-sm text-center py-4">No uploads yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
