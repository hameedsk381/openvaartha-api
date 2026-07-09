'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

export type IconAnimationType = 'bounce' | 'rotate' | 'scale' | 'arrowUpRight' | 'spin';

interface AnimatedIconProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  animationType?: IconAnimationType;
  triggerOnHover?: boolean; // If true, applies whileHover. If false, relies on parent variants or animate prop.
  isActive?: boolean; // Forces the "active" or "hover" state via the animate prop
}

export function AnimatedIcon({
  children,
  animationType = 'scale',
  triggerOnHover = true,
  isActive = false,
  className,
  ...props
}: AnimatedIconProps) {
  
  const getVariants = () => {
    switch (animationType) {
      case 'arrowUpRight':
        return {
          initial: { x: 0, y: 0 },
          hover: { x: 3, y: -3 },
        };
      case 'bounce':
        return {
          initial: { y: 0 },
          hover: { y: -4 },
        };
      case 'rotate':
        return {
          initial: { rotate: 0 },
          hover: { rotate: 90 },
        };
      case 'spin':
        return {
          initial: { rotate: 0 },
          hover: { rotate: 180 },
        };
      case 'scale':
        return {
          initial: { scale: 1 },
          hover: { scale: 1.15 },
        };
      default:
        return {};
    }
  };

  const motionProps: HTMLMotionProps<"div"> = {
    variants: getVariants(),
    initial: "initial",
    animate: isActive ? "hover" : "initial",
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  };

  // Only attach whileHover if we want the icon itself to trigger it.
  // Otherwise, a parent motion component can trigger the "hover" variant.
  if (triggerOnHover) {
    motionProps.whileHover = "hover";
  }

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.div>
  );
}
