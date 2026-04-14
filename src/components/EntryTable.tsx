import { File, Folder } from 'lucide-react';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { type FileEntry } from '@/lib/s3-object-storage';

type EntryTableProps = { entries: FileEntry[]; isLoading: boolean };

function EntryTable({ entries, isLoading }: EntryTableProps) {
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/50 text-start text-muted-foreground">
          <tr>
            <th className="max-w-0 px-4 py-2 text-start font-medium">Name</th>
            <th className="w-24 px-4 py-2 text-end font-medium">Size</th>
            <th className="w-40 px-4 py-2 text-end font-medium">Modified</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={3}>
                Loading objects...
              </td>
            </tr>
          )}
          {!isLoading && entries.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={3}>
                This directory is empty.
              </td>
            </tr>
          )}
          {!isLoading &&
            entries.map((entry) => (
              <tr className="border-bs" key={entry.path}>
                <td className="px-4 py-2">
                  {entry.type === 'DIR' && (
                    <Button
                      className="h-auto w-full min-w-0 justify-start p-0 font-normal text-foreground hover:text-primary"
                      onClick={() => setCurrentPath(entry.path)}
                      size="sm"
                      title={entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                      type="button"
                      variant="ghost"
                    >
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">
                        {entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                      </span>
                    </Button>
                  )}
                  {entry.type === 'FILE' && (
                    <span
                      className="inline-flex w-full min-w-0 items-center gap-2"
                      title={entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                    >
                      <File className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">
                        {entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-end whitespace-nowrap text-muted-foreground">
                  {entry.size && formatFileSize(entry.size)}
                  {!entry.size && '—'}
                </td>
                <td className="px-4 py-2 text-end whitespace-nowrap text-muted-foreground">
                  {entry.modified && formatModifiedDate(entry.modified)}
                  {!entry.modified && '—'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
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
