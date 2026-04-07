import { House, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import EntryTable from '@/components/EntryTable';
import { SignInDialog } from '@/components/sign-in-dialog';
import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { ROOT_PATH } from '@/lib/s3-object-storage';

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

  const pathSegments = currentPath === ROOT_PATH ? [] : currentPath.slice(1).split('/');
  const breadcrumbItems = [
    { label: 'Root', path: ROOT_PATH },
    ...pathSegments.map((segment, index) => ({
      label: segment,
      path: `/${pathSegments.slice(0, index + 1).join('/')}`,
    })),
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">S3 Browser</h1>
            <p className="mt-1 text-sm text-muted-foreground">Frontend-only browser that talks directly to S3.</p>
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
            <ol className="flex min-h-7 items-center gap-1 whitespace-nowrap text-sm">
              {breadcrumbItems.map((breadcrumb, index) => {
                const isCurrent = breadcrumb.path === currentPath;
                const isRootBreadcrumb = breadcrumb.path === ROOT_PATH;
                return (
                  <li className="inline-flex h-7 items-center gap-1" key={breadcrumb.path}>
                    <Button
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-label={isRootBreadcrumb ? 'Root' : undefined}
                      className={`h-7 px-1 py-0 ${isCurrent ? 'font-medium text-foreground' : 'font-normal'}`}
                      disabled={!connection || isTableLoading}
                      onClick={() => setCurrentPath(breadcrumb.path)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {isRootBreadcrumb ? (
                        <>
                          <House aria-hidden className="size-4" />
                          {isCurrent && <span className="sr-only">Root</span>}
                        </>
                      ) : (
                        breadcrumb.label
                      )}
                    </Button>
                    {index < breadcrumbItems.length - 1 && <span className="text-muted-foreground">/</span>}
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
