import type { AssistantPermission, AssistantTool } from './assistantTypes';

export function checkPermission(
  tool: AssistantTool,
  allowedPermissions: Set<AssistantPermission>
): boolean {
  return allowedPermissions.has(tool.permission);
}

export function requiresConfirmation(tool: AssistantTool): boolean {
  return tool.requiresConfirmation;
}

export const DEFAULT_ALLOWED_PERMISSIONS: Set<AssistantPermission> = new Set([
  'read',
  'navigate'
]);

export const CONFIRMED_ALLOWED_PERMISSIONS: Set<AssistantPermission> = new Set([
  'read',
  'navigate',
  'modify'
]);
