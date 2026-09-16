import * as React from 'react';
import { motion } from 'motion/react';

import {
  TabGroup as TabGroupPrimitive,
  TabList as TabListPrimitive,
  Tab as TabPrimitive,
  TabPanel as TabPanelPrimitive,
  TabPanels as TabPanelsPrimitive,
  type TabGroupProps as TabGroupPrimitiveProps,
  type TabListProps as TabListPrimitiveProps,
  type TabProps as TabPrimitiveProps,
  type TabPanelProps as TabPanelPrimitiveProps,
  type TabPanelsProps as TabPanelsPrimitiveProps,
} from '@headlessui/react';
import { cn } from '@/lib/utils';

type TabGroupProps<TTag extends React.ElementType = 'div'> =
  TabGroupPrimitiveProps<TTag>;

function TabGroup<TTag extends React.ElementType = 'div'>({
  className,
  ...props
}: TabGroupProps<TTag>) {
  return (
    <TabGroupPrimitive
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

type TabListProps<TTag extends React.ElementType = 'div'> =
  TabListPrimitiveProps<TTag>;

// CSS-only tab highlight — no JavaScript getBoundingClientRect() measurements.
// The ::after pseudo-element on the active tab handles the highlight via CSS transitions.
function TabList<TTag extends React.ElementType = 'div'>({
  className,
  ...props
}: TabListProps<TTag>) {
  return (
    <TabListPrimitive
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] relative',
        className,
      )}
      {...props}
    />
  );
}

type TabProps<TTag extends React.ElementType = 'button'> =
  TabPrimitiveProps<TTag>;

function Tab<TTag extends React.ElementType = 'button'>({
  className,
  ...props
}: TabProps<TTag>) {
  return (
    <TabPrimitive
      className={cn(
        "data-[selected='true']:text-foreground data-[selected='true']:bg-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md w-full px-2 py-1 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

type TabPanelsProps<TTag extends React.ElementType = typeof motion.div> =
  TabPanelsPrimitiveProps<TTag>;

function TabPanels<TTag extends React.ElementType = typeof motion.div>(
  props: TabPanelsProps<TTag>,
) {
  return <TabPanelsPrimitive {...props} />;
}

type TabPanelProps<TTag extends React.ElementType = typeof motion.div> =
  TabPanelPrimitiveProps<TTag>;

function TabPanel<TTag extends React.ElementType = typeof motion.div>({
  className,
  ...props
}: TabPanelProps<TTag>) {
  return (
    <TabPanelPrimitive
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  type TabGroupProps,
  type TabListProps,
  type TabProps,
  type TabPanelsProps,
  type TabPanelProps,
};
