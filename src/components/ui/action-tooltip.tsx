import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActionTooltipProps {
  children: ReactNode;
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ActionTooltip({ children, label, side = 'top' }: ActionTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
