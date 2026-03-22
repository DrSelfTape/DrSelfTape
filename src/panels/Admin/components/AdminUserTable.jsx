import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const statusColors = {
  active: 'bg-green-500/10 text-green-400',
  suspended: 'bg-yellow-500/10 text-yellow-400',
  banned: 'bg-red-500/10 text-red-400',
  inactive: 'bg-[#2A2A2A] text-[#666666]',
  completed: 'bg-green-500/10 text-green-400',
  pending: 'bg-yellow-500/10 text-yellow-400',
  failed: 'bg-red-500/10 text-red-400',
  refunded: 'bg-blue-500/10 text-blue-400',
};

export default function AdminUserTable({ columns, data = [], onRowClick, emptyMessage = 'No data found.' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!data.length) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center text-[#666666]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#0D0D0D]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-[#666666] whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer select-none hover:text-white' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, ri) => (
              <tr
                key={row.id ?? ri}
                className={`border-b border-[#1E1E1E] hover:bg-[#1E1E1E]/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? (
                      col.render(row)
                    ) : col.type === 'avatar' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#C855F0]/10 text-[#C855F0] flex items-center justify-center text-xs font-bold">
                          {getInitials(row[col.nameKey || 'name'])}
                        </div>
                        <span className="font-medium text-white">{row[col.nameKey || 'name']}</span>
                      </div>
                    ) : col.type === 'status' ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[row[col.key]?.toLowerCase()] || 'bg-[#2A2A2A] text-[#666666]'}`}>
                        {row[col.key]}
                      </span>
                    ) : col.type === 'date' ? (
                      <span className="text-[#999999]">
                        {row[col.key] ? new Date(row[col.key]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    ) : col.type === 'currency' ? (
                      <span className="font-medium text-white">
                        ${typeof row[col.key] === 'number' ? row[col.key].toFixed(2) : row[col.key] ?? '0.00'}
                      </span>
                    ) : (
                      <span className="text-[#999999]">{row[col.key] ?? '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2A2A2A]">
          <span className="text-sm text-[#999999]">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-[#2A2A2A] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i ? 'bg-[#C855F0] text-white' : 'hover:bg-[#2A2A2A] text-[#999999]'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-[#2A2A2A] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
