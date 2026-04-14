import { RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import Breadcrumbs from '@/components/Breadcrumbs';
import EntryTable from '@/components/EntryTable';
import { SignInDialog } from '@/components/SignInDialog';
import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { fetchDirectoryEntries } from '@/lib/s3-object-storage';

function App() {
  const connection = useS3ConnectionsStore((state) => state.connection);

  const currentEntries = useS3BrowserStore((state) => state.currentEntries);
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentEntries = useS3BrowserStore((state) => state.setCurrentEntries);
  const resetBrowser = useS3BrowserStore((state) => state.reset);

  const [entryTableRefreshToken, setEntryTableRefreshToken] = useState(0);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (!connection) {
      resetBrowser();
      setIsTableLoading(false);
    }
  }, [connection, resetBrowser]);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    void fetchDirectoryEntries(connection, currentPath)
      .then((nextEntries) => {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }
        setCurrentEntries(nextEntries);
      })
      .catch(() => {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }
        setCurrentEntries([]);
      })
      .finally(() => {
        if (requestId === latestRequestIdRef.current) {
          setIsTableLoading(false);
        }
      });
  }, [connection, currentPath, entryTableRefreshToken, setCurrentEntries]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-be p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">S3 Browser</h1>
            <p className="mbs-1 text-sm text-muted-foreground">Frontend-only browser for S3.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!connection || isTableLoading}
              onClick={() => setEntryTableRefreshToken((token) => token + 1)}
              type="button"
              variant="outline"
            >
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsSignInDialogOpen(true)} type="button">
              Connection
            </Button>
            <SignInDialog onOpen={setIsSignInDialogOpen} open={isSignInDialogOpen} />
          </div>
        </header>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{connection ? <>Connected</> : 'No active connection.'}</p>
            <p className="text-xs">
              URL: <span className="font-medium text-foreground">{connection?.url ?? 'not configured'}</span>
            </p>
          </div>
          <Breadcrumbs />

          <EntryTable entries={currentEntries} isLoading={isTableLoading} />
        </div>
      </section>
    </main>
  );
}

export default App;
