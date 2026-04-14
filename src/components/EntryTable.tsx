import { File, Folder } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import {
  childPath,
  fetchDirectoryEntries,
  formatFileSize,
  formatModifiedDate,
  type FileEntry,
} from '@/lib/s3-object-storage';

type EntryTableProps = { onLoadingChange?: (isLoading: boolean) => void; refreshToken: number };

type EntryRowsProps = { entries: FileEntry[]; isLoading: boolean; onOpenDirectory: (directoryName: string) => void };

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function EntryRows({ entries, isLoading, onOpenDirectory }: EntryRowsProps) {
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
    <tr className="border-bs" key={`${entry.type}:${entry.name}`}>
      <td className="px-4 py-2">
        {entry.type === 'DIR' ? (
          <Button
            className="h-auto justify-start p-0 font-normal text-foreground hover:text-primary"
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
      <td className="px-4 py-2 text-end text-muted-foreground">
        {entry.type === 'FILE' ? formatFileSize(entry.size) : '—'}
      </td>
      <td className="px-4 py-2 text-end text-muted-foreground">{formatModifiedDate(entry.modified)}</td>
    </tr>
  ));
}

function EntryTable({ onLoadingChange, refreshToken }: EntryTableProps) {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const currentEntries = useS3BrowserStore((state) => state.currentEntries);
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentEntries = useS3BrowserStore((state) => state.setCurrentEntries);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string>();
  const latestRequestIdRef = useRef(0);

  const loadEntries = useCallback(async () => {
    if (!connection) {
      setCurrentEntries([]);
      setListError(undefined);
      setIsLoading(false);
      onLoadingChange?.(false);
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsLoading(true);
    onLoadingChange?.(true);
    setListError(undefined);

    try {
      const entries = await fetchDirectoryEntries(connection, currentPath);
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setCurrentEntries(entries);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setCurrentEntries([]);
      setListError(toRawErrorMessage(error));
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
  }, [connection, currentPath, onLoadingChange, setCurrentEntries]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, refreshToken]);

  return (
    <>
      {listError && <p className="text-sm text-destructive">{listError}</p>}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 text-end font-medium">Size</th>
              <th className="px-4 py-2 text-end font-medium">Modified</th>
            </tr>
          </thead>
          <tbody>
            <EntryRows
              entries={currentEntries}
              isLoading={isLoading}
              onOpenDirectory={(directoryName) => setCurrentPath(childPath(currentPath, directoryName))}
            />
          </tbody>
        </table>
      </div>
    </>
  );
}

export default EntryTable;
