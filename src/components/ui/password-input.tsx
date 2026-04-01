import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

function PasswordInput({ className, disabled, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        className={cn('pr-10', className)}
        disabled={disabled}
        type={showPassword ? 'text' : 'password'}
      />
      <Button
        type="button"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        onClick={() => setShowPassword((previous) => !previous)}
        disabled={disabled}
        variant="ghost"
      >
        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

export { PasswordInput };
