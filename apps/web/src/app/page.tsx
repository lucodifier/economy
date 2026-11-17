'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GoogleIcon, CurrencyDollarIcon } from '../components/Icons';

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app');
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-xl w-full rounded-2xl bg-white shadow p-8 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Minhas Economias</h1>
            <p className="mt-1 text-slate-600">
              Gerencie contas, transações e categorias. Importe e exporte seus dados por período.
            </p>
          </div>
        </div>

        <div className="mt-6 flex">
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/app', redirect: true })}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-white font-medium shadow-sm"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <GoogleIcon className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </div>
    </main>
  );
}
