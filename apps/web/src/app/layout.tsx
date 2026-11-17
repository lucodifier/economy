import './globals.css';
import React from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'Minhas Economias',
  description: 'Gerenciamento de economias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
