'use client';

import React, { useEffect, useState } from 'react';
import { type Webhook, listWebhooks, createWebhook, updateWebhook, deleteWebhook, testDiscordAlerts } from '../../../lib/api';
import { PencilIcon, TrashIcon, PlusIcon } from '../../../components/Icons';

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', url: '', events: ['expense_due'] });
  const [createForm, setCreateForm] = useState({ name: '', url: '', events: ['expense_due'] });
  const [testing, setTesting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listWebhooks();
      setWebhooks(list);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="flex-1 bg-white lg:bg-slate-50">
      <div className="p-4 lg:p-6 border-b bg-white">
        <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-600">Gerencie webhooks do Discord para alertas.</p>
      </div>

      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-900">Webhooks Discord</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                try {
                  await testDiscordAlerts();
                  alert('Alertas enviados! Verifique seu Discord.');
                } catch (e: any) {
                  alert(`Erro: ${e?.message || e}`);
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                '🔔'
              )}
              <span className="hidden sm:inline">{testing ? 'Enviando...' : 'Testar agora'}</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={() => {
                setIsCreating(true);
                setCreateForm({ name: '', url: '', events: ['expense_due'] });
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Novo webhook</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-900">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-900 hidden md:table-cell">URL</th>
                <th className="px-4 py-3 font-medium text-slate-900">Eventos</th>
                <th className="px-4 py-3 font-medium text-slate-900">Status</th>
                <th className="px-4 py-3 font-medium text-slate-900 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isCreating && (
                <tr className="bg-blue-50 border-b border-slate-200">
                  <td className="px-4 py-3">
                    <input
                      className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Nome do webhook..."
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <input
                      className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={createForm.url}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Contas a pagar
                    </span>
                  </td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        onClick={async () => {
                          if (!createForm.name.trim()) return alert('Informe um nome.');
                          if (!createForm.url.trim()) return alert('Informe a URL do webhook.');
                          if (!createForm.url.startsWith('https://discord.com/api/webhooks/')) {
                            return alert('URL deve ser um webhook válido do Discord.');
                          }
                          await createWebhook(createForm);
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
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                      Carregando...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && webhooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum webhook cadastrado.
                  </td>
                </tr>
              )}

              {!loading &&
                webhooks.map((w) => (
                  <tr key={w.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    {editingId === w.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <input
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={editForm.url}
                            onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Contas a pagar
                          </span>
                        </td>
                        <td className="px-4 py-3">-</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              onClick={async () => {
                                if (!editForm.name.trim()) return alert('Informe um nome.');
                                if (!editForm.url.trim()) return alert('Informe a URL do webhook.');
                                await updateWebhook(w.id, editForm);
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
                        <td className="px-4 py-3 text-slate-900 font-medium">{w.name}</td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell truncate max-w-xs">{w.url}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Contas a pagar
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {w.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              onClick={() => {
                                setEditingId(w.id);
                                setEditForm({ name: w.name, url: w.url, events: w.events });
                              }}
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              onClick={async () => {
                                await updateWebhook(w.id, { active: !w.active });
                                await refresh();
                              }}
                              title={w.active ? 'Desativar' : 'Ativar'}
                            >
                              {w.active ? '⏸' : '▶'}
                            </button>
                            <button
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              onClick={async () => {
                                if (!confirm('Excluir webhook?')) return;
                                await deleteWebhook(w.id);
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
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-slate-50 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-900 mb-2">Como configurar</h3>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Abra o Discord e vá para o canal desejado</li>
            <li>Clique em Configurações do Canal → Integrações → Webhooks</li>
            <li>Clique em "Novo Webhook" e copie a URL</li>
            <li>Cole a URL acima ao cadastrar o webhook</li>
            <li>O sistema enviará alertas diariamente às 09:00 para contas a pagar</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
