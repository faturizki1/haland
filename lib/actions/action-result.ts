import { ActionError } from "./action-error";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail<T>(error: ActionError): ActionResult<T> {
  return { success: false, error };
}

export function isActionSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success;
}
