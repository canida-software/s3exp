import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type S3Connection = { url: string; accessKey: string; secretKey: string };

type S3ConnectionsStore = {
  connection: S3Connection | undefined;
  saveConnection: (connection: S3Connection) => S3Connection;
};

export const useS3ConnectionsStore = create<S3ConnectionsStore>()(
  persist(
    (set) => ({
      connection: undefined,
      saveConnection: (connection) => {
        set({ connection });
        return connection;
      },
    }),
    { name: 's3exp.connections', storage: createJSONStorage(() => localStorage) },
  ),
);
