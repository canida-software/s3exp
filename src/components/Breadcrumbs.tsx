import { House } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useS3BrowserStore } from '@/lib/s3-browser-store';

function Breadcrumbs() {
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto">
      <ol className="flex h-7 items-center gap-1 overflow-y-hidden text-sm whitespace-nowrap">
        <li className="inline-flex h-7 items-center gap-1">
          <Button
            aria-label="Root"
            className="h-7 px-1 text-foreground hover:bg-transparent"
            size="sm"
            variant="ghost"
            onClick={() => setCurrentPath('')}
          >
            <House aria-hidden className="size-4" />
          </Button>
        </li>

        {pathSegments.map((pathSegment, index) => (
          <li className="inline-flex h-7 items-center gap-1" key={`${pathSegment}-${index}`}>
            <span className="text-muted-foreground">/</span>
            <Button
              className="h-7 px-1 text-foreground hover:bg-transparent"
              onClick={() => setCurrentPath(`${pathSegments.slice(0, index + 1).join('/')}/`)}
              size="sm"
              variant="ghost"
            >
              {pathSegment}
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
