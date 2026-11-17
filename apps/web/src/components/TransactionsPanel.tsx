'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Account, Category, Transaction } from '../lib/api';
import { createTransaction, deleteTransaction, downloadExport, importFile, previewImport, listTransactions, updateTransaction } from '../lib/api';
import { Modal } from './Modal';
import { PencilIcon, TrashIcon, PlusIcon, FilterIcon, DownloadIcon, UploadIcon, CheckboxIcon } from './Icons';

function formatCurrencyInput(raw: string, forceNegative = false) {
  const digitsOnly = raw.replace(/\D/g, '');
  const padded = digitsOnly.padStart(3, '0'); // garante pelo menos 1 inteiro + 2 decimais
  const intPart = padded.slice(0, -2).replace(/^0+/, '') || '0';
  const cents = padded.slice(-2);
  const intWithSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${forceNegative ? '-' : ''}${intWithSeparators},${cents}`;
}

function parseCurrencyToNumber(masked: string) {
  const negative = masked.trim().startsWith('-');
  const digits = masked.replace(/\D/g, '');
  const value = Number(digits || '0') / 100;
  return negative ? -value : value;
}

function getFirstDayOfMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

function getLastDayOfMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionsPanel({
  accounts,
  categories,
  selectedAccountId,
}: {
  accounts: Account[];
  categories: Category[];
  selectedAccountId?: string;
}) {
  const [from, setFrom] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openExport, setOpenExport] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<{
    date: string;
    description: string;
    amount: string;
    categoryId: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    consolidated: boolean;
  }>({ date: '', description: '', amount: '', categoryId: '', type: 'EXPENSE', consolidated: false });
  const [createForm, setCreateForm] = useState<{
    date: string;
    description: string;
    amount: string;
    categoryId: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    consolidated: boolean;
  }>({ date: isoToday(), description: '', amount: '0,00', categoryId: '', type: 'EXPENSE', consolidated: false });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listTransactions({ from, to, accountId: selectedAccountId, q: q.trim() || undefined });
      setItems(list);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, selectedAccountId]);

  const total = useMemo(() => {
    return items.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items]);

  const groupedItems = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    sortedItems.forEach(item => {
      const date = item.date.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [sortedItems]);

  return (
    <section className="flex-1 bg-white lg:bg-slate-50">
      <div className="p-4 lg:p-6 border-b bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3">
            <div className="flex flex-col">
              <label className="block text-xs font-medium text-slate-600 mb-1">De</label>
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-medium text-slate-600 mb-1">Até</label>
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Busca</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Descrição..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && refresh()}
                />
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => refresh()}
                  title="Aplicar filtros"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtrar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={() => {
                setIsCreating(true);
                setCreateForm({ date: isoToday(), description: '', amount: '0,00', categoryId: '', type: 'EXPENSE', consolidated: false });
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar transação</span>
              <span className="sm:hidden">Adicionar</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setOpenImport(true)}
            >
              <UploadIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setOpenExport(true)}
            >
              <DownloadIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">Conta:</span>
            <span className="px-2 py-1 bg-slate-100 rounded text-slate-800">{selectedAccount?.name || 'Todas'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Total do período:</span>
            <span className={`px-2 py-1 rounded font-medium ${total < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-slate-900">Data</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Descrição</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden sm:table-cell">Categoria</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden lg:table-cell">Conta</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 font-medium text-slate-900 w-16 text-center">Consolidado</th>
                  <th className="px-4 py-3 font-medium text-slate-900 text-right">Valor</th>
                  <th className="px-4 py-3 font-medium text-slate-900 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {isCreating && (
                  <tr className="bg-blue-50 border-b border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.date}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Descrição..."
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.categoryId}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      >
                        <option value="">Sem categoria</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{selectedAccount?.name || 'Todas'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.type}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER' }))}
                      >
                        <option value="EXPENSE">Despesa</option>
                        <option value="INCOME">Receita</option>
                        <option value="TRANSFER">Transferência</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className={`p-1 rounded transition-colors ${createForm.consolidated ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'
                          }`}
                        onClick={() => setCreateForm(prev => ({ ...prev, consolidated: !prev.consolidated }))}
                        title="Marcar como consolidado"
                      >
                        <CheckboxIcon className="w-4 h-4" checked={createForm.consolidated} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.amount}
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                          }, 0);
                        }}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, amount: formatCurrencyInput(e.target.value) }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          onClick={async () => {
                            const amount = parseCurrencyToNumber(createForm.amount);
                            if (!createForm.description.trim()) return alert('Informe uma descrição.');
                            if (!Number.isFinite(amount) || amount === 0) return alert('Informe um valor válido.');
                            if (!selectedAccountId) return alert('Selecione uma conta.');

                            await createTransaction({
                              accountId: selectedAccountId,
                              categoryId: createForm.categoryId || null,
                              date: createForm.date,
                              description: createForm.description,
                              amount: Math.abs(amount),
                              type: createForm.type,
                              consolidated: createForm.consolidated
                            });
                            setIsCreating(false);
                            await refresh();
                          }}
                          title="Salvar"
                        >
                          ✓
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                          onClick={() => setIsCreating(false)}
                          title="Cancelar"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                        Carregando...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma transação no período.
                    </td>
                  </tr>
                )}

                {!loading &&
                  groupedItems.map(([date, transactions]) => {
                    const dayTotal = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
                    return (
                      <React.Fragment key={date}>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td className="px-4 py-3 font-medium text-slate-900">{formatDate(date)}</td>
                          <td className="px-4 py-3 font-medium text-slate-600" colSpan={5}>Total do dia</td>
                          <td className={`px-4 py-3 text-right font-medium ${dayTotal < 0 ? "text-red-600" : "text-emerald-600"
                            }`}>
                            {formatCurrency(dayTotal)}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                        {transactions.map((t) => (
                          <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                            {editingId === t.id ? (
                              <>
                                <td className="px-4 py-3">
                                  <input
                                    type="date"
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  />
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  <select
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editForm.categoryId}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, categoryId: e.target.value }))}
                                  >
                                    <option value="">Sem categoria</option>
                                    {categories.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{t.account?.name || ''}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <select
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editForm.type}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER' }))}
                                  >
                                    <option value="EXPENSE">Despesa</option>
                                    <option value="INCOME">Receita</option>
                                    <option value="TRANSFER">Transferência</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    className={`p-1 rounded transition-colors ${editForm.consolidated ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'
                                      }`}
                                    onClick={() => setEditForm(prev => ({ ...prev, consolidated: !prev.consolidated }))}
                                    title="Marcar como consolidado"
                                  >
                                    <CheckboxIcon className="w-4 h-4" checked={editForm.consolidated} />
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editForm.amount}
                                    onFocus={(e) => {
                                      setTimeout(() => {
                                        e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                                      }, 0);
                                    }}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: formatCurrencyInput(e.target.value) }))}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    <button
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                      onClick={async () => {
                                        const amount = parseCurrencyToNumber(editForm.amount);
                                        if (!editForm.description.trim()) return alert('Informe uma descrição.');
                                        if (!Number.isFinite(amount) || amount === 0) return alert('Informe um valor válido.');

                                        await updateTransaction(t.id, {
                                          date: editForm.date,
                                          description: editForm.description,
                                          amount: Math.abs(amount),
                                          categoryId: editForm.categoryId || null,
                                          type: editForm.type,
                                          consolidated: editForm.consolidated
                                        });
                                        setEditingId(null);
                                        await refresh();
                                      }}
                                      title="Salvar"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                                      onClick={() => setEditingId(null)}
                                      title="Cancelar"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-slate-900 font-medium">{formatDate(t.date.slice(0, 10))}</td>
                                <td className="px-4 py-3 text-slate-700">{t.description}</td>
                                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{t.category?.name || 'Sem categoria'}</td>
                                <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{t.account?.name || ''}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${t.type === 'EXPENSE' ? 'bg-red-100 text-red-700' : t.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {t.type === 'EXPENSE' ? 'Despesa' : t.type === 'TRANSFER' ? 'Transferência' : 'Receita'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    className={`p-1 rounded transition-colors ${t.consolidated ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'
                                      }`}
                                    onClick={async () => {
                                      await updateTransaction(t.id, { consolidated: !t.consolidated });
                                      await refresh();
                                    }}
                                    title={t.consolidated ? 'Marcar como não consolidado' : 'Marcar como consolidado'}
                                  >
                                    <CheckboxIcon className="w-4 h-4" checked={t.consolidated} />
                                  </button>
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${Number(t.amount) < 0 ? "text-red-600" : "text-emerald-600"
                                  }`}>
                                  {formatCurrency(Number(t.amount))}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    <button
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      onClick={() => {
                                        setEditingId(t.id);
                                        setEditForm({
                                          date: t.date.slice(0, 10),
                                          description: t.description,
                                          amount: formatCurrencyInput(Math.abs(Number(t.amount)).toFixed(2).replace('.', '')),
                                          categoryId: t.categoryId || '',
                                          type: t.type,
                                          consolidated: t.consolidated
                                        });
                                      }}
                                      title="Editar"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      onClick={async () => {
                                        if (!confirm('Excluir transação?')) return;
                                        await deleteTransaction(t.id);
                                        await refresh();
                                      }}
                                      title="Excluir"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                {!loading && items.length > 0 && (
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td className="px-4 py-4 font-bold text-slate-900" colSpan={6}>TOTAL GERAL</td>
                    <td className={`px-4 py-4 text-right font-bold ${total < 0 ? "text-red-600" : "text-emerald-600"
                      }`}>
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ExportModal
        open={openExport}
        onClose={() => setOpenExport(false)}
        from={from}
        to={to}
        accountId={selectedAccountId}
        onExport={async (format, exportFrom, exportTo) => {
          await downloadExport({ from: exportFrom, to: exportTo, accountId: selectedAccountId, format });
          setOpenExport(false);
        }}
      />

      <ImportModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        accounts={accounts}
        defaultAccountId={selectedAccountId}
        onImport={async (accountId, file) => {
          await importFile(accountId, file);
          setOpenImport(false);
          await refresh();
        }}
      />
    </section>
  );
}

function ExportModal({
  open,
  onClose,
  from: initialFrom,
  to: initialTo,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  from: string;
  to: string;
  accountId?: string;
  onExport: (format: 'csv' | 'xlsx', from: string, to: string) => void | Promise<void>;
}) {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  useEffect(() => {
    if (open) {
      setFormat('xlsx');
      setFrom(initialFrom);
      setTo(initialTo);
    }
  }, [open, initialFrom, initialTo]);

  return (
    <Modal title="Exportar transações" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-slate-600">
          Selecione o período e formato para exportação.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">De</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Até</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">Formato:</div>
          <label className="text-sm flex items-center gap-2">
            <input type="radio" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
            XLSX
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="radio" checked={format === 'csv'} onChange={() => setFormat('csv')} />
            CSV
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-md px-3 py-2 border" onClick={onClose}>Cancelar</button>
          <button
            className="rounded-md px-3 py-2 text-white"
            style={{ backgroundColor: 'var(--brand)' }}
            onClick={() => onExport(format, from, to)}
          >
            Exportar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({
  open,
  onClose,
  accounts,
  defaultAccountId,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  defaultAccountId?: string;
  onImport: (accountId: string, file: File) => void | Promise<void>;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'preview' | 'importing'>('select');

  useEffect(() => {
    if (!open) {
      setAccountId(defaultAccountId || accounts[0]?.id || '');
      setFile(null);
      setPreview(null);
      setStep('select');
    }
  }, [open, defaultAccountId, accounts]);

  const handlePreview = async () => {
    if (!accountId || !file) return;

    setLoading(true);
    try {
      const result = await previewImport(accountId, file);
      setPreview(result);
      setStep('preview');
    } catch (error: any) {
      alert('Erro ao processar arquivo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!accountId || !file) return;

    setStep('importing');
    try {
      await onImport(accountId, file);
    } catch (error: any) {
      alert('Erro na importação: ' + error.message);
      setStep('preview');
    }
  };

  return (
    <Modal title="Importar dados" open={open} onClose={onClose}>
      <div className="space-y-4">
        {step === 'select' && (
          <>
            <p className="text-sm text-slate-600">
              Selecione a conta destino e envie um arquivo <strong>CSV/XLS/XLSX</strong>.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo</label>
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                onClick={handlePreview}
                disabled={!accountId || !file || loading}
              >
                {loading ? 'Processando...' : 'Pré-visualizar'}
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Pré-visualização da Importação</h3>
                <button
                  className="text-sm text-slate-500 hover:text-slate-700"
                  onClick={() => setStep('select')}
                >
                  ← Voltar
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Conta:</span> {preview.account}
                  </div>
                  <div>
                    <span className="font-medium">Total de registros:</span> {preview.total}
                  </div>
                </div>
              </div>

              {preview.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-2">Erros encontrados:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {preview.errors.slice(0, 5).map((error: any, idx: number) => (
                      <li key={idx}>Linha {error.row}: {error.error}</li>
                    ))}
                    {preview.errors.length > 5 && (
                      <li>... e mais {preview.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}

              {preview.preview?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Primeiras transações:</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Data</th>
                          <th className="px-3 py-2 text-left">Descrição</th>
                          <th className="px-3 py-2 text-left">Categoria</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t border-slate-200">
                            <td className="px-3 py-2">{item.date}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2">{item.category || 'Sem categoria'}</td>
                            <td className={`px-3 py-2 text-right font-medium ${item.amount < 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}>
                              {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                onClick={handleConfirmImport}
              >
                Confirmar Importação
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Importando dados...</p>
          </div>
        )}
      </div>
    </Modal>
  );
}