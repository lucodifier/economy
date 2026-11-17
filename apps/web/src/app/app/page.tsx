'use client';

import React, { useEffect, useState } from 'react';
import { createAccount, createCategory, deleteAccount, deleteCategory, updateAccount, updateCategory, listAccounts, listCategories, type Account, type Category } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { Sidebar } from '../../components/Sidebar';
import { TransactionsPanel } from '../../components/TransactionsPanel';
import { CurrencyDollarIcon } from '../../components/Icons';

export default function AppPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);

  const [openAccount, setOpenAccount] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [name, setName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [a, c] = await Promise.all([listAccounts(), listCategories()]);
      setAccounts(a);
      setCategories(c);
      if (a.length && !selectedAccountId) setSelectedAccountId(a[0].id);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          Carregando dados...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
          <button 
            className="mt-4 w-full rounded-lg px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" 
            onClick={() => refreshAll()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row">
        <Sidebar
          accounts={accounts}
          categories={categories}
          selectedAccountId={selectedAccountId}
          onSelectAccount={(id) => setSelectedAccountId(id)}
          onAddAccount={() => {
            setName('');
            setOpenAccount(true);
          }}
          onEditAccount={async (id, name) => {
            await updateAccount(id, name);
            await refreshAll();
          }}
          onDeleteAccount={async (id) => {
            if (!confirm('Excluir conta? Isso remove também as transações dela.')) return;
            await deleteAccount(id);
            await refreshAll();
          }}
          onAddCategory={() => {
            setName('');
            setOpenCategory(true);
          }}
          onEditCategory={async (id, name) => {
            await updateCategory(id, name);
            await refreshAll();
          }}
          onDeleteCategory={async (id) => {
            if (!confirm('Excluir categoria?')) return;
            await deleteCategory(id);
            await refreshAll();
          }}
        />

        <TransactionsPanel accounts={accounts} categories={categories} selectedAccountId={selectedAccountId} />
      </div>

      <Modal title="Nova conta" open={openAccount} onClose={() => setOpenAccount(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Digite o nome da conta"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors" 
              onClick={() => setOpenAccount(false)}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={async () => {
                if (!name.trim()) return alert('Informe um nome');
                await createAccount(name.trim());
                setOpenAccount(false);
                await refreshAll();
              }}
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Nova categoria" open={openCategory} onClose={() => setOpenCategory(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Digite o nome da categoria"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors" 
              onClick={() => setOpenCategory(false)}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={async () => {
                if (!name.trim()) return alert('Informe um nome');
                await createCategory(name.trim());
                setOpenCategory(false);
                await refreshAll();
              }}
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
