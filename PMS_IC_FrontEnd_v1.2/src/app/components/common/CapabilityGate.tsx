import React from 'react';
import { useProjectAuth, Capability } from '../../../hooks/api/useProjectAuth';

interface CapabilityGateProps {
  required: Capability[];
  mode?: 'all' | 'any';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on user capabilities.
 * UX convenience only - server enforces real security via 403.
 */
export function CapabilityGate({
  required,
  mode = 'all',
  children,
  fallback = null,
}: CapabilityGateProps) {
  const { capabilities } = useProjectAuth();

  const hasAccess = mode === 'all'
    ? required.every(cap => capabilities.includes(cap))
    : required.some(cap => capabilities.includes(cap));

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
