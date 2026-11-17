'use client';

import React, { useState } from 'react';
import type { Account, Category } from '../lib/api';
import { Modal } from './Modal';
import { PencilIcon, TrashIcon, PlusIcon, CurrencyDollarIcon } from './Icons';

export function Sidebar({
  accounts,
  categories,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount,
  onEditAccount,
  onAddCategory,
  onDeleteCategory,
  onEditCategory,
}: {
  accounts: Account[];
  categories: Category[];
  selectedAccountId?: string;
  onSelectAccount: (id?: string) => void;
  onAddAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onEditAccount: (id: string, name: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  onEditCategory: (id: string, name: string) => void;
}) {
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <>
      <aside className="w-full lg:w-80 bg-white border-r border-slate-200 lg:min-h-screen">
        {/* Accounts Section */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Contas</h2>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                onClick={onAddAccount}
              >
                <PlusIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Nova</span>
              </button>
              <button
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => onSelectAccount(undefined)}
                title="Limpar filtro"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <button
                  className={[
                    'flex-1 text-left rounded-lg px-3 py-2 text-sm transition-colors',
                    selectedAccountId === a.id 
                      ? 'bg-emerald-50 text-emerald-900 font-medium border border-emerald-200' 
                      : 'hover:bg-slate-50 text-slate-700',
                  ].join(' ')}
                  onClick={() => onSelectAccount(a.id)}
                >
                  {a.name}
                </button>
                <button
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  onClick={() => {
                    setEditingAccount({ id: a.id, name: a.name });
                    setEditName(a.name);
                  }}
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  onClick={() => onDeleteAccount(a.id)}
                  title="Excluir"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">
                Nenhuma conta ainda.
              </div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Categorias</h2>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={onAddCategory}
            >
              <PlusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Nova</span>
            </button>
          </div>

          <div className="space-y-1">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-700">
                  {c.name}
                </div>
                <button
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  onClick={() => {
                    setEditingCategory({ id: c.id, name: c.name });
                    setEditName(c.name);
                  }}
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  onClick={() => onDeleteCategory(c.id)}
                  title="Excluir"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">
                Nenhuma categoria ainda.
              </div>
            )}
          </div>
        </div>
      </aside>

      <Modal
        title={editingAccount ? 'Editar Conta' : 'Editar Categoria'}
        open={!!(editingAccount || editingCategory)}
        onClose={() => {
          setEditingAccount(null);
          setEditingCategory(null);
          setEditName('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Digite o nome..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => {
                setEditingAccount(null);
                setEditingCategory(null);
                setEditName('');
              }}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              onClick={() => {
                if (!editName.trim()) return alert('Informe um nome.');
                if (editingAccount) {
                  onEditAccount(editingAccount.id, editName.trim());
                } else if (editingCategory) {
                  onEditCategory(editingCategory.id, editName.trim());
                }
                setEditingAccount(null);
                setEditingCategory(null);
                setEditName('');
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
