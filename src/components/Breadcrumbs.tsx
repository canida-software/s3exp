import { House } from 'lucide-react';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useS3BrowserStore } from '@/lib/s3-browser-store';

function Breadcrumbs() {
  const currentPath = useS3BrowserStore((state) => state.currentPath);
  const setCurrentPath = useS3BrowserStore((state) => state.setCurrentPath);

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <Breadcrumb className="overflow-x-auto">
      <BreadcrumbList className="h-7 flex-nowrap overflow-y-hidden whitespace-nowrap">
        <BreadcrumbItem className="h-7">
          <BreadcrumbLink aria-label="Root" onClick={() => setCurrentPath('')} render={<button type="button" />}>
            <House aria-hidden className="size-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathSegments.map((pathSegment, index) => (
          <Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="h-7">
              <BreadcrumbLink
                onClick={() => setCurrentPath(`${pathSegments.slice(0, index + 1).join('/')}/`)}
                render={<button type="button" />}
              >
                {pathSegment}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default Breadcrumbs;
