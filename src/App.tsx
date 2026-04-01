import { useCallback, useEffect, useState } from 'react';

import { BrowserShell } from '@/components/s3-browser-shell';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import {
  childPath,
  fetchDirectoryEntries,
  parentPath,
  ROOT_PATH,
  type BrowserEntry,
} from '@/lib/s3-object-storage';

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function App() {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const [entries, setEntries] = useState<BrowserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [path, setPath] = useState(ROOT_PATH);

  const loadEntries = useCallback(async () => {
    if (!connection) {
      return;
    }

    setIsLoading(true);
    setListError(null);
    try {
      setEntries(await fetchDirectoryEntries(connection, path));
    } catch (error) {
      setEntries([]);
      setListError(toRawErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [connection, path]);

  useEffect(() => {
    if (!connection) {
      setEntries([]);
      setIsLoading(false);
      setListError(null);
      return;
    }
    void loadEntries();
  }, [connection, loadEntries]);

  return (
    <BrowserShell
      connection={connection}
      entries={entries}
      goToParentDirectory={() => setPath((previous) => parentPath(previous))}
      isLoading={isLoading}
      listError={listError}
      onOpenDirectory={(directoryName) => setPath((previous) => childPath(previous, directoryName))}
      onRefresh={() => void loadEntries()}
      path={path}
      rootPath={ROOT_PATH}
    />
  );
}

export default App;
