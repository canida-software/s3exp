import { File, Folder } from 'lucide-react';
import { DateTime } from 'luxon';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { downloadS3File, type FileEntry } from '@/lib/s3-object-storage';

type EntryTableProps = { entries: FileEntry[]; isLoading: boolean };

function EntryTable({ entries, isLoading }: EntryTableProps) {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === 'DIR') return setCurrentPath(entry.path);

    if (!connection) return;
    void downloadS3File(connection, entry.path);
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-0" />
            <TableHead className="text-muted-foreground">Name</TableHead>
            <TableHead className="text-end text-muted-foreground">Size</TableHead>
            <TableHead className="text-end text-muted-foreground">Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow className="hover:bg-transparent">
              <TableCell className="py-10 text-center" colSpan={4}>
                Loading objects...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && entries.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell className="py-10 text-center" colSpan={4}>
                This directory is empty.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            entries.map((entry) => (
              <TableRow key={entry.path} className="cursor-pointer" onClick={() => handleEntryClick(entry)}>
                <TableCell>
                  {entry.type === 'DIR' && <Folder className="size-4 shrink-0 text-muted-foreground" />}
                  {entry.type === 'FILE' && <File className="size-4 shrink-0 text-muted-foreground" />}
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex w-full min-w-0"
                    title={entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                  >
                    <span className="min-w-0 truncate">
                      {entry.path.split('/').filter(Boolean).pop() ?? entry.path}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  {entry.size && formatFileSize(entry.size)}
                  {!entry.size && '—'}
                </TableCell>
                <TableCell className="text-end">
                  {entry.modified && formatModifiedDate(entry.modified)}
                  {!entry.modified && '—'}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
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
