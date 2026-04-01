import { useState } from 'react';
import { File, Folder, RefreshCcw } from 'lucide-react';

import { SignInDialog } from '@/components/sign-in-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type S3Connection } from '@/lib/s3-connections-store';
import { formatFileSize, formatModifiedDate, type BrowserEntry } from '@/lib/s3-object-storage';

type EntryTableProps = {
  entries: BrowserEntry[];
  isLoading: boolean;
  onOpenDirectory: (directoryName: string) => void;
};

type BrowserShellProps = {
  connection: S3Connection | undefined;
  entries: BrowserEntry[];
  goToParentDirectory: () => void;
  isLoading: boolean;
  listError: string | undefined;
  onOpenDirectory: (directoryName: string) => void;
  onRefresh: () => void;
  path: string;
  rootPath: string;
};

function EntryTable({ entries, isLoading, onOpenDirectory }: EntryTableProps) {
  if (isLoading) {
    return (
      <tr>
        <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
          Loading objects...
        </td>
      </tr>
    );
  }

  if (entries.length === 0) {
    return (
      <tr>
        <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
          This directory is empty.
        </td>
      </tr>
    );
  }

  return entries.map((entry) => (
    <tr className="border-t" key={entry.key}>
      <td className="px-4 py-2">
        {entry.kind === 'directory' ? (
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
      <td className="px-4 py-2 capitalize text-muted-foreground">{entry.kind}</td>
      <td className="px-4 py-2 text-right text-muted-foreground">
        {entry.kind === 'file' ? formatFileSize(entry.size) : '—'}
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">{formatModifiedDate(entry.lastModified)}</td>
    </tr>
  ));
}

function BrowserShell({
  connection,
  entries,
  goToParentDirectory,
  isLoading,
  listError,
  onOpenDirectory,
  onRefresh,
  path,
  rootPath,
}: BrowserShellProps) {
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">S3 Browser</h1>
            <p className="mt-1 text-sm text-muted-foreground">Frontend-only browser that talks directly to S3.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={!connection || isLoading} onClick={onRefresh} type="button" variant="outline">
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsSignInDialogOpen(true)} type="button">
              Connection
            </Button>
            <SignInDialog onOpenChange={setIsSignInDialogOpen} open={isSignInDialogOpen} />
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
              disabled={!connection || isLoading || path === rootPath}
              onClick={goToParentDirectory}
              type="button"
              variant="outline"
            >
              Up
            </Button>
            <Input readOnly value={path} />
          </div>

          {listError && <p className="text-sm text-destructive">{listError}</p>}

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">Size</th>
                  <th className="px-4 py-2 text-right font-medium">Modified</th>
                </tr>
              </thead>
              <tbody>
                <EntryTable entries={entries} isLoading={isLoading} onOpenDirectory={onOpenDirectory} />
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export { BrowserShell };
