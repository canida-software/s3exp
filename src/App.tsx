import { House, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import EntryTable from '@/components/EntryTable';
import { SignInDialog } from '@/components/sign-in-dialog';
import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';

function App() {
  const connection = useS3ConnectionsStore((state) => state.connection);

  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  const resetBrowser = useS3BrowserStore((state) => state.reset);

  const [entryTableRefreshToken, setEntryTableRefreshToken] = useState(0);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);

  useEffect(() => {
    if (!connection) {
      resetBrowser();
      setIsTableLoading(false);
    }
  }, [connection, resetBrowser]);

  const pathSegments = currentPath.split('/').slice(1);

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
          <nav aria-label="Breadcrumb" className="overflow-x-auto">
            <ol className="flex h-7 items-center gap-1 overflow-y-hidden text-sm whitespace-nowrap">
              <li className="inline-flex h-7 items-center gap-1">
                <Button
                  aria-label="Root"
                  className="h-7 px-1 text-foreground hover:bg-transparent"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPath('/')}
                >
                  <House aria-hidden className="size-4" />
                </Button>
              </li>

              {pathSegments.map((pathSegment, index) => {
                return (
                  <li className="inline-flex h-7 items-center gap-1" key={pathSegment}>
                    <span className="text-muted-foreground">/</span>
                    <Button
                      className="h-7 px-1 text-foreground hover:bg-transparent"
                      onClick={() => setCurrentPath(`/${pathSegments.slice(0, index + 1).join('/')}`)}
                      size="sm"
                      variant="ghost"
                    >
                      {pathSegment}
                    </Button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <EntryTable onLoadingChange={setIsTableLoading} refreshToken={entryTableRefreshToken} />
        </div>
      </section>
    </main>
  );
}

export default App;
