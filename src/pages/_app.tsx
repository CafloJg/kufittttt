import type { AppProps } from 'next/app';
import { UserProvider } from '../context/UserContext';
import { ToastProvider } from '../context/ToastContext';
import { ClientOnly } from '../components/ClientOnly';
import { OfflineProvider } from '../context/OfflineContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClientOnly>
      <ToastProvider>
        <OfflineProvider options={{ checkInterval: 15000 }}>
          <UserProvider>
            <Component {...pageProps} />
          </UserProvider>
        </OfflineProvider>
      </ToastProvider>
    </ClientOnly>
  );
} 