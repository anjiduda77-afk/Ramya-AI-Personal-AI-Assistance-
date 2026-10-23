import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const DataSqlScreen: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState('settings');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tables = ['settings', 'tasks', 'reminders', 'notes', 'documents', 'audit_logs', 'watchlists'];

  useEffect(() => {
    loadTableData(selectedTable);
  }, [selectedTable]);

  const loadTableData = async (tbl: string) => {
    setLoading(true);
    try {
      if (tbl === 'tasks') {
        const data = await api.getTasks(true);
        setTableData(data);
      } else if (tbl === 'reminders') {
        const data = await api.getReminders();
        setTableData(data);
      } else if (tbl === 'notes') {
        const data = await api.getNotes();
        setTableData(data);
      } else if (tbl === 'documents') {
        const data = await api.listDocuments();
        setTableData(data);
      } else if (tbl === 'audit_logs') {
        const data = await api.getAuditLogs();
        setTableData(data);
      } else if (tbl === 'watchlists') {
        const data = await api.getWatchlist();
        setTableData(data);
      } else if (tbl === 'settings') {
        const s = await api.getSettings();
        setTableData(Object.entries(s).map(([k, v]) => ({ key: k, value: String(v) })));
      }
    } catch (e: any) {
      console.warn('Error loading table:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          DATA & SQLITE REPOSITORY EXPLORER
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Inspect local SQLite tables, parameterized query schemas, and persistent migration logs
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTable(t)}
            className={`cyber-btn ${selectedTable === t ? '' : 'cyber-btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '8px 14px' }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Data Viewer Table */}
      <div className="holo-card" style={{ padding: '20px', flex: 1, overflowX: 'auto' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '12px' }}>
          TABLE: {selectedTable.toUpperCase()} ({tableData.length} RECORDS)
        </div>

        {tableData.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--neon-cyan)' }}>
                {Object.keys(tableData[0]).map((col) => (
                  <th key={col} style={{ padding: '8px 12px' }}>{col.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {Object.values(row).map((val: any, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px 12px', color: '#fff' }} className="mono-font">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>
            {loading ? 'Querying database...' : 'No records found in this table.'}
          </div>
        )}
      </div>
    </div>
  );
};
