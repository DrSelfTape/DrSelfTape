import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DollarSign, Calendar, RotateCcw, CreditCard, Download } from 'lucide-react';
import { fetchAdminPayments } from '../../redux/features/admin/adminSlice';
import AdminStatCard from './components/AdminStatCard';
import AdminUserTable from './components/AdminUserTable';

const statusOptions = ['All', 'completed', 'pending', 'failed', 'refunded'];
const planOptions = ['All', 'free', 'basic', 'pro', 'enterprise'];

const columns = [
  { key: 'user_name', label: 'User' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'plan', label: 'Plan' },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'date', label: 'Date', type: 'date' },
];

export default function AdminPayments() {
  const dispatch = useDispatch();
  const { payments, paymentsLoading } = useSelector((state) => state.admin);

  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    dispatch(fetchAdminPayments());
  }, [dispatch]);

  const paymentList = Array.isArray(payments) ? payments : [];

  const filteredPayments = useMemo(() => {
    let result = paymentList;
    if (statusFilter !== 'All') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (planFilter !== 'All') {
      result = result.filter((p) => p.plan === planFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((p) => new Date(p.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      result = result.filter((p) => new Date(p.date) <= to);
    }
    return result;
  }, [paymentList, statusFilter, planFilter, dateFrom, dateTo]);

  // Summary calculations
  const totalRevenue = paymentList
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0), 0);

  const now = new Date();
  const thisMonthRevenue = paymentList
    .filter((p) => {
      if (p.status !== 'completed') return false;
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0), 0);

  const refundsTotal = paymentList
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0), 0);

  const activeSubscriptions = paymentList.filter((p) => p.status === 'completed' && p.plan && p.plan !== 'free').length;

  const summaryCards = [
    { icon: DollarSign, label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { icon: Calendar, label: 'This Month', value: `$${thisMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { icon: RotateCcw, label: 'Refunds', value: `$${refundsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { icon: CreditCard, label: 'Active Subscriptions', value: activeSubscriptions.toLocaleString() },
  ];

  const handleExportCSV = useCallback(() => {
    const header = ['User', 'Amount', 'Plan', 'Payment Method', 'Status', 'Date'];
    const rows = filteredPayments.map((p) => [
      p.user_name || '',
      typeof p.amount === 'number' ? p.amount.toFixed(2) : p.amount || '0.00',
      p.plan || '',
      p.payment_method || '',
      p.status || '',
      p.date ? new Date(p.date).toLocaleDateString() : '',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <AdminStatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F]"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F]"
        >
          {planOptions.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'All Plans' : p}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F]"
        />

        <div className="flex-1" />

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4A85F] text-white rounded-xl text-sm font-medium hover:bg-[#D4A85F]/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Loading */}
      {paymentsLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!paymentsLoading && (
        <AdminUserTable
          columns={columns}
          data={filteredPayments}
          emptyMessage="No payments found."
        />
      )}
    </div>
  );
}
