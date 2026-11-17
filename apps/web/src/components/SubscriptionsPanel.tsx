'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Subscription } from '../lib/api';
import { createSubscription, deleteSubscription, listSubscriptions, updateSubscription } from '../lib/api';
import { PencilIcon, TrashIcon, PlusIcon } from './Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

function formatCurrencyInput(raw: string) {
  const digitsOnly = raw.replace(/\D/g, '');
  const padded = digitsOnly.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+/, '') || '0';
  const cents = padded.slice(-2);
  const intWithSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intWithSeparators},${cents}`;
}

function parseCurrencyToNumber(masked: string) {
  const digits = masked.replace(/\D/g, '');
  return Number(digits || '0') / 100;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value: number | string) {
  const numValue = typeof value === 'string' ? Number(value) : value;
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function SubscriptionsPanel() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    startDate: string;
    monthlyValue: string;
    autoRenewal: boolean;
    nextRenewalDate: string;
    endDate: string;
  }>({
    name: '',
    startDate: '',
    monthlyValue: '0,00',
    autoRenewal: false,
    nextRenewalDate: '',
    endDate: '',
  });
  const [createForm, setCreateForm] = useState<{
    name: string;
    startDate: string;
    monthlyValue: string;
    autoRenewal: boolean;
    nextRenewalDate: string;
    endDate: string;
  }>({
    name: '',
    startDate: isoToday(),
    monthlyValue: '0,00',
    autoRenewal: false,
    nextRenewalDate: '',
    endDate: '',
  });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listSubscriptions();
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
  }, []);

  // Calcular assinaturas ativas no mês atual
  const activeSubscriptionsThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return items.filter(s => {
      const startDate = new Date(s.startDate);
      const endDate = s.endDate ? new Date(s.endDate) : null;
      
      // Assinatura está ativa se:
      // - Começou antes ou durante o mês atual
      // - Não tem data de encerramento OU a data de encerramento é depois do início do mês atual
      return startDate <= currentMonthEnd && (!endDate || endDate >= currentMonthStart);
    });
  }, [items]);

  const totalMonthly = useMemo(() => {
    return activeSubscriptionsThisMonth.reduce((sum, s) => sum + Number(s.monthlyValue), 0);
  }, [activeSubscriptionsThisMonth]);

  // Dados para o gráfico de pizza
  const chartData = useMemo(() => {
    return activeSubscriptionsThisMonth
      .map(s => ({
        name: s.name,
        value: Number(s.monthlyValue),
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeSubscriptionsThisMonth]);

  // Dados para o gráfico de barras (ranking)
  const barChartData = useMemo(() => {
    return activeSubscriptionsThisMonth
      .map(s => ({
        name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
        fullName: s.name,
        value: Number(s.monthlyValue),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  }, [activeSubscriptionsThisMonth]);

  // Cores para o gráfico de pizza
  const COLORS = [
    '#10b981', // emerald-500
    '#3b82f6', // blue-500
    '#8b5cf6', // purple-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-slate-900">{payload[0].payload.fullName || payload[0].name}</p>
          <p className="text-sm text-slate-600">
            Valor: <span className="font-medium text-emerald-600">R$ {formatCurrency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="flex-1 bg-white lg:bg-slate-50">
      <div className="p-4 lg:p-6 border-b bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">Assinaturas de Serviços</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={() => {
                setIsCreating(true);
                setCreateForm({
                  name: '',
                  startDate: isoToday(),
                  monthlyValue: '0,00',
                  autoRenewal: false,
                  nextRenewalDate: '',
                  endDate: '',
                });
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar assinatura</span>
              <span className="sm:hidden">Adicionar</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">Total mensal ativo:</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">
              R$ {formatCurrency(totalMonthly)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Assinaturas ativas:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
              {activeSubscriptionsThisMonth.length}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {/* Gráficos e Visualizações */}
        {activeSubscriptionsThisMonth.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Pizza */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribuição por Assinatura</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                              <p className="font-medium text-slate-900">{payload[0].payload.name}</p>
                              <p className="text-sm text-slate-600">
                                Valor: <span className="font-medium text-emerald-600">R$ {formatCurrency(payload[0].value)}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                {((payload[0].value / totalMonthly) * 100).toFixed(1)}% do total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Nenhuma assinatura ativa no mês atual
                </div>
              )}
            </div>

            {/* Ranking - Quem consome mais */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Ranking - Maiores Consumidores</h2>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData} layout="vertical">
                    <XAxis type="number" tickFormatter={(value) => `R$ ${formatCurrency(value)}`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Nenhuma assinatura ativa no mês atual
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de Ranking */}
        {activeSubscriptionsThisMonth.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Ranking Detalhado - Mês Atual</h2>
            <div className="space-y-2">
              {activeSubscriptionsThisMonth
                .map(s => ({
                  ...s,
                  value: Number(s.monthlyValue),
                  percentage: (Number(s.monthlyValue) / totalMonthly) * 100,
                }))
                .sort((a, b) => b.value - a.value)
                .map((s, index) => (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.percentage.toFixed(1)}% do total mensal
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">R$ {formatCurrency(s.value)}</div>
                        <div className="text-xs text-slate-500">mensal</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-32">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${s.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
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
                  <th className="px-4 py-3 font-medium text-slate-900">Nome</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Data Início</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Valor Mensal</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden md:table-cell">Renovação Automática</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden lg:table-cell">Próxima Renovação</th>
                  <th className="px-4 py-3 font-medium text-slate-900 hidden lg:table-cell">Encerramento</th>
                  <th className="px-4 py-3 font-medium text-slate-900 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {isCreating && (
                  <tr className="bg-blue-50 border-b border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Nome do serviço..."
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setCreateForm(prev => ({
                            ...prev,
                            startDate: newStartDate,
                            nextRenewalDate: prev.autoRenewal && newStartDate ? addMonths(new Date(newStartDate), 1).toISOString().slice(0, 10) : prev.nextRenewalDate,
                          }));
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.monthlyValue}
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                          }, 0);
                        }}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, monthlyValue: formatCurrencyInput(e.target.value) }))}
                      />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        checked={createForm.autoRenewal}
                        onChange={(e) => {
                          const autoRenewal = e.target.checked;
                          setCreateForm(prev => ({
                            ...prev,
                            autoRenewal,
                            nextRenewalDate: autoRenewal && prev.startDate ? addMonths(new Date(prev.startDate), 1).toISOString().slice(0, 10) : '',
                          }));
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <input
                        type="date"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.nextRenewalDate}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, nextRenewalDate: e.target.value }))}
                        disabled={!createForm.autoRenewal}
                      />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <input
                        type="date"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={createForm.endDate}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          onClick={async () => {
                            const monthlyValue = parseCurrencyToNumber(createForm.monthlyValue);
                            if (!createForm.name.trim()) return alert('Informe um nome.');
                            if (!createForm.startDate) return alert('Informe a data de início.');
                            if (!Number.isFinite(monthlyValue) || monthlyValue <= 0) return alert('Informe um valor mensal válido.');

                            await createSubscription({
                              name: createForm.name.trim(),
                              startDate: createForm.startDate,
                              monthlyValue,
                              autoRenewal: createForm.autoRenewal,
                              nextRenewalDate: createForm.nextRenewalDate || null,
                              endDate: createForm.endDate || null,
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
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                        Carregando...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma assinatura cadastrada.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((s) => {
                    const isEnded = s.endDate && new Date(s.endDate) < new Date();
                    return (
                      <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isEnded ? 'opacity-60' : ''}`}>
                        {editingId === s.id ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={editForm.startDate}
                                onChange={(e) => {
                                  const newStartDate = e.target.value;
                                  setEditForm(prev => ({
                                    ...prev,
                                    startDate: newStartDate,
                                    nextRenewalDate: prev.autoRenewal && newStartDate ? addMonths(new Date(newStartDate), 1).toISOString().slice(0, 10) : prev.nextRenewalDate,
                                  }));
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={editForm.monthlyValue}
                                onFocus={(e) => {
                                  setTimeout(() => {
                                    e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                                  }, 0);
                                }}
                                onChange={(e) => setEditForm(prev => ({ ...prev, monthlyValue: formatCurrencyInput(e.target.value) }))}
                              />
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                checked={editForm.autoRenewal}
                                onChange={(e) => {
                                  const autoRenewal = e.target.checked;
                                  setEditForm(prev => ({
                                    ...prev,
                                    autoRenewal,
                                    nextRenewalDate: autoRenewal && prev.startDate ? addMonths(new Date(prev.startDate), 1).toISOString().slice(0, 10) : '',
                                  }));
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={editForm.nextRenewalDate}
                                onChange={(e) => setEditForm(prev => ({ ...prev, nextRenewalDate: e.target.value }))}
                                disabled={!editForm.autoRenewal}
                              />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={editForm.endDate}
                                onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  onClick={async () => {
                                    const monthlyValue = parseCurrencyToNumber(editForm.monthlyValue);
                                    if (!editForm.name.trim()) return alert('Informe um nome.');
                                    if (!editForm.startDate) return alert('Informe a data de início.');
                                    if (!Number.isFinite(monthlyValue) || monthlyValue <= 0) return alert('Informe um valor mensal válido.');

                                    await updateSubscription(s.id, {
                                      name: editForm.name.trim(),
                                      startDate: editForm.startDate,
                                      monthlyValue,
                                      autoRenewal: editForm.autoRenewal,
                                      nextRenewalDate: editForm.nextRenewalDate || null,
                                      endDate: editForm.endDate || null,
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
                            <td className="px-4 py-3 text-slate-900 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-slate-700">{formatDate(s.startDate)}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              R$ {formatCurrency(s.monthlyValue)}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.autoRenewal ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                {s.autoRenewal ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                              {s.nextRenewalDate ? formatDate(s.nextRenewalDate) : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                              {s.endDate ? formatDate(s.endDate) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  onClick={() => {
                                    setEditingId(s.id);
                                    setEditForm({
                                      name: s.name,
                                      startDate: s.startDate.slice(0, 10),
                                      monthlyValue: formatCurrencyInput(Math.abs(Number(s.monthlyValue)).toFixed(2).replace('.', '')),
                                      autoRenewal: s.autoRenewal,
                                      nextRenewalDate: s.nextRenewalDate ? s.nextRenewalDate.slice(0, 10) : '',
                                      endDate: s.endDate ? s.endDate.slice(0, 10) : '',
                                    });
                                  }}
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  onClick={async () => {
                                    if (!confirm('Excluir assinatura?')) return;
                                    await deleteSubscription(s.id);
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
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
