import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type S3ConnectionInput = { url: string; accessKeyId: string; secretAccessKey: string };

export type S3Connection = S3ConnectionInput;

type S3ConnectionsStore = {
  connection: S3Connection | null;
  saveConnection: (connection: S3ConnectionInput) => S3Connection;
};

export function selectActiveConnection(store: S3ConnectionsStore): S3Connection | null {
  return store.connection;
}

export const useS3ConnectionsStore = create<S3ConnectionsStore>()(
  persist(
    (set) => ({
      connection: null,
      saveConnection: (connection) => {
        set({ connection });
        return connection;
      },
    }),
    { name: 's3exp.connections', storage: createJSONStorage(() => localStorage) },
  ),
);
