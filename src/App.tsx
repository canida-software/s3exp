import { useCallback, useEffect, useState } from 'react';

import { BrowserShell } from '@/components/s3-browser-shell';
import { useS3BrowserStore } from '@/lib/s3-browser-store';
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { childPath, fetchDirectoryEntries, parentPath, ROOT_PATH } from '@/lib/s3-object-storage';

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function App() {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const currentEntries = useS3BrowserStore((state) => state.currentEntries);
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentEntries = useS3BrowserStore((state) => state.setCurrentEntries);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);
  const resetBrowser = useS3BrowserStore((state) => state.reset);

  const [isLoading, setIsLoading] = useState(false);
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
    <BrowserShell
      connection={connection}
      entries={currentEntries}
      goToParentDirectory={() => setCurrentPath(parentPath(currentPath))}
      isLoading={isLoading}
      listError={listError}
      onOpenDirectory={(directoryName) => setCurrentPath(childPath(currentPath, directoryName))}
      onRefresh={() => void loadEntries()}
      path={currentPath}
      rootPath={ROOT_PATH}
    />
  );
}

export default App;
