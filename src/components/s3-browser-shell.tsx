import { Database, Eye, EyeOff, File, Folder, RefreshCcw } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type S3Connection } from '@/lib/s3-connections-store';

export type BrowserEntry = {
  key: string;
  kind: 'directory' | 'file';
  lastModified?: Date;
  name: string;
  size?: number;
};

export type ConnectionFormValues = {
  accessKeyId: string;
  url: string;
  secretAccessKey: string;
};

type EntryTableProps = {
  entries: BrowserEntry[];
  isLoading: boolean;
  onOpenDirectory: (directoryName: string) => void;
  formatFileSize: (sizeInBytes?: number) => string;
  formatModifiedDate: (value?: Date) => string;
};

type ConnectionDialogProps = {
  connection: S3Connection | null;
  connectionError: string | null;
  formValues: ConnectionFormValues;
  isConnecting: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateFormValue: (field: keyof ConnectionFormValues, value: string) => void;
};

type BrowserShellProps = {
  connection: S3Connection | null;
  connectionDialogOpen: boolean;
  connectionError: string | null;
  entries: BrowserEntry[];
  formValues: ConnectionFormValues;
  goToParentDirectory: () => void;
  isConnecting: boolean;
  isLoading: boolean;
  listError: string | null;
  onCloseDialog: () => void;
  onOpenConnectionDialog: () => void;
  onOpenDirectory: (directoryName: string) => void;
  onRefresh: () => void;
  onSubmitConnection: (event: FormEvent<HTMLFormElement>) => void;
  path: string;
  rootPath: string;
  updateFormValue: (field: keyof ConnectionFormValues, value: string) => void;
  formatFileSize: (sizeInBytes?: number) => string;
  formatModifiedDate: (value?: Date) => string;
};

function EntryTable({ entries, formatFileSize, formatModifiedDate, isLoading, onOpenDirectory }: EntryTableProps) {
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
      <td className="px-4 py-2 text-right text-muted-foreground">{entry.kind === 'file' ? formatFileSize(entry.size) : '—'}</td>
      <td className="px-4 py-2 text-right text-muted-foreground">{formatModifiedDate(entry.lastModified)}</td>
    </tr>
  ));
}

function ConnectionDialog({
  connection,
  connectionError,
  formValues,
  isConnecting,
  isOpen,
  onClose,
  onSubmit,
  updateFormValue,
}: ConnectionDialogProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <Dialog
      disablePointerDismissal={!connection}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !connection) {
          return;
        }
        if (!nextOpen) {
          onClose();
        }
      }}
      open={isOpen}
    >
      <DialogContent className="p-0">
        <DialogHeader>
          <DialogTitle>Connect to S3</DialogTitle>
          <DialogDescription>Credentials are stored in localStorage for now.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4 p-5" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Endpoint URL</span>
            <Input
              autoFocus
              disabled={isConnecting}
              onChange={(event) => updateFormValue('url', event.target.value)}
              placeholder="https://example-bucket.s3.eu-central-1.amazonaws.com/example-prefix/"
              value={formValues.url}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">Access Key</span>
              <Input
                disabled={isConnecting}
                onChange={(event) => updateFormValue('accessKeyId', event.target.value)}
                placeholder="AKIA..."
                value={formValues.accessKeyId}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">Secret Key</span>
              <div className="relative">
                <Input
                  className="pr-10"
                  disabled={isConnecting}
                  onChange={(event) => updateFormValue('secretAccessKey', event.target.value)}
                  placeholder="••••••••"
                  type={showSecret ? 'text' : 'password'}
                  value={formValues.secretAccessKey}
                />
                <Button
                  aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  disabled={isConnecting}
                  onClick={() => setShowSecret((previous) => !previous)}
                  type="button"
                  variant="ghost"
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </label>
          </div>

          {connectionError ? <p className="text-sm text-destructive">{connectionError}</p> : null}

          <DialogFooter>
            {connection ? (
              <Button disabled={isConnecting} onClick={onClose} type="button" variant="outline">
                Close
              </Button>
            ) : null}
            <Button disabled={isConnecting} type="submit">
              {isConnecting ? 'Testing...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BrowserShell({
  connection,
  connectionDialogOpen,
  connectionError,
  entries,
  formValues,
  formatFileSize,
  formatModifiedDate,
  goToParentDirectory,
  isConnecting,
  isLoading,
  listError,
  onCloseDialog,
  onOpenConnectionDialog,
  onOpenDirectory,
  onRefresh,
  onSubmitConnection,
  path,
  rootPath,
  updateFormValue,
}: BrowserShellProps) {
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
            <Button onClick={onOpenConnectionDialog} type="button">
              <Database className="size-4" />
              Connection
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{connection ? <>Connected</> : 'No active connection.'}</p>
            <p className="text-xs">URL: <span className="font-medium text-foreground">{connection?.url ?? 'not configured'}</span></p>
          </div>

          <div className="flex items-center gap-2">
            <Button disabled={!connection || isLoading || path === rootPath} onClick={goToParentDirectory} type="button" variant="outline">
              Up
            </Button>
            <Input readOnly value={path} />
          </div>

          {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

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
                <EntryTable
                  entries={entries}
                  formatFileSize={formatFileSize}
                  formatModifiedDate={formatModifiedDate}
                  isLoading={isLoading}
                  onOpenDirectory={onOpenDirectory}
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConnectionDialog
        connection={connection}
        connectionError={connectionError}
        formValues={formValues}
        isConnecting={isConnecting}
        isOpen={connectionDialogOpen}
        onClose={onCloseDialog}
        onSubmit={onSubmitConnection}
        updateFormValue={updateFormValue}
      />
    </main>
  );
}

export { BrowserShell };
