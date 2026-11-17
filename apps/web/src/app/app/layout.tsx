'use client';

import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { CurrencyDollarIcon, GoogleIcon } from '../../components/Icons';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando...
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold">Você precisa estar logado</h2>
          <p className="mt-2 text-slate-600">
            Faça login com Google para acessar suas contas e transações.
          </p>
          <button
            onClick={() => signIn('google', { callbackUrl: '/app' })}
            className="mt-4 w-full rounded-lg px-4 py-2 text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <GoogleIcon className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="h-12 flex items-center justify-between px-4 text-white" style={{ backgroundColor: 'var(--brand)' }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold">Minhas Economias</span>
          <nav className="hidden md:flex items-center gap-4 text-sm opacity-95 ml-6">
            <a className="hover:underline" href="/app">Transações</a>
            <a className="hover:underline" href="/app/subscriptions">Assinaturas</a>
            <a className="hover:underline" href="/app/settings">Configurações</a>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline opacity-90">{data?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-md px-3 py-1 border border-white/30 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
