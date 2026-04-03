import { File, Folder, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { SignInDialog } from '@/components/sign-in-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import {
  childPath,
  fetchDirectoryEntries,
  formatFileSize,
  formatModifiedDate,
  parentPath,
  ROOT_PATH,
  type FileEntry,
} from '@/lib/s3-object-storage';

type EntryTableProps = { entries: FileEntry[]; isLoading: boolean; onOpenDirectory: (directoryName: string) => void };

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function EntryTable({ entries, isLoading, onOpenDirectory }: EntryTableProps) {
  if (isLoading) {
    return (
      <tr>
        <td className="px-4 py-10 text-center text-muted-foreground" colSpan={3}>
          Loading objects...
        </td>
      </tr>
    );
  }

  if (entries.length === 0) {
    return (
      <tr>
        <td className="px-4 py-10 text-center text-muted-foreground" colSpan={3}>
          This directory is empty.
        </td>
      </tr>
    );
  }

  return entries.map((entry) => (
    <tr className="border-t" key={`${entry.type}:${entry.name}`}>
      <td className="px-4 py-2">
        {entry.type === 'DIR' ? (
          <Button
            className="h-auto justify-start px-0 py-0 font-normal text-foreground hover:text-primary"
            onClick={() => onOpenDirectory(entry.name)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Folder className="size-4 text-muted-foreground" />
            {entry.name}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2">
            <File className="size-4 text-muted-foreground" />
            {entry.name}
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">{entry.type === 'FILE' ? formatFileSize(entry.size) : '—'}</td>
      <td className="px-4 py-2 text-right text-muted-foreground">{formatModifiedDate(entry.modified)}</td>
    </tr>
  ));
}

function App() {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const currentEntries = useS3BrowserStore((state) => state.currentEntries);
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentEntries = useS3BrowserStore((state) => state.setCurrentEntries);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);
  const resetBrowser = useS3BrowserStore((state) => state.reset);

  const [isLoading, setIsLoading] = useState(false);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [listError, setListError] = useState<string>();

  const loadEntries = useCallback(async () => {
    if (!connection) {
      return;
    }

    setIsLoading(true);
    setListError(undefined);
    try {
      setCurrentEntries(await fetchDirectoryEntries(connection, currentPath));
    } catch (error) {
      setCurrentEntries([]);
      setListError(toRawErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [connection, currentPath, setCurrentEntries]);

  useEffect(() => {
    if (!connection) {
      resetBrowser();
      setIsLoading(false);
      setListError(undefined);
      return;
    }
    void loadEntries();
  }, [connection, loadEntries, resetBrowser]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">S3 Browser</h1>
            <p className="mt-1 text-sm text-muted-foreground">Frontend-only browser that talks directly to S3.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={!connection || isLoading} onClick={() => void loadEntries()} type="button" variant="outline">
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

          <div className="flex items-center gap-2">
            <Button
              disabled={!connection || isLoading || currentPath === ROOT_PATH}
              onClick={() => setCurrentPath(parentPath(currentPath))}
              type="button"
              variant="outline"
            >
              Up
            </Button>
            <Input readOnly value={currentPath} />
          </div>

          {listError && <p className="text-sm text-destructive">{listError}</p>}

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 text-right font-medium">Size</th>
                  <th className="px-4 py-2 text-right font-medium">Modified</th>
                </tr>
              </thead>
              <tbody>
                <EntryTable
                  entries={currentEntries}
                  isLoading={isLoading}
                  onOpenDirectory={(directoryName) => setCurrentPath(childPath(currentPath, directoryName))}
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
