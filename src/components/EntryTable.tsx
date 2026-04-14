import { File, Folder } from 'lucide-react';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { type FileEntry } from '@/lib/s3-object-storage';

type EntryTableProps = { entries: FileEntry[]; isLoading: boolean; listError?: string };
type EntryRowsProps = { entries: FileEntry[]; isLoading: boolean };

function EntryRows({ entries, isLoading }: EntryRowsProps) {
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

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
    <tr className="border-bs" key={`${entry.type}:${entry.path}`}>
      <td className="px-4 py-2">
        {entry.type === 'DIR' && (
          <Button
            className="h-auto justify-start p-0 font-normal text-foreground hover:text-primary"
            onClick={() => setCurrentPath(entry.path)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Folder className="size-4 text-muted-foreground" />
            {entry.path.split('/').filter(Boolean).pop()}
          </Button>
        )}
        {entry.type === 'FILE' && (
          <span className="inline-flex items-center gap-2">
            <File className="size-4 text-muted-foreground" />
            {entry.path.split('/').filter(Boolean).pop()}
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-end text-muted-foreground">
        {entry.size && formatFileSize(entry.size)}
        {!entry.size && '—'}
      </td>
      <td className="px-4 py-2 text-end text-muted-foreground">
        {entry.modified && formatModifiedDate(entry.modified)}
        {!entry.modified && '—'}
      </td>
    </tr>
  ));
}

function EntryTable({ entries, isLoading, listError }: EntryTableProps) {
  return (
    <>
      {listError && <p className="text-sm text-destructive">{listError}</p>}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-start font-medium">Name</th>
              <th className="px-4 py-2 text-end font-medium">Size</th>
              <th className="px-4 py-2 text-end font-medium">Modified</th>
            </tr>
          </thead>
          <tbody>
            <EntryRows entries={entries} isLoading={isLoading} />
          </tbody>
        </table>
      </div>
    </>
  );
}

// TODO refactor
function formatFileSize(sizeInBytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  let value = sizeInBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formattedValue = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formattedValue} ${units[unitIndex]}`;
}

function formatModifiedDate(value: number): string {
  return DateTime.fromMillis(value).toFormat('yyyy-LL-dd HH:mm');
}

export default EntryTable;
