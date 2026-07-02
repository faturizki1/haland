import { ZodError } from "zod";
import { ActionError } from "./action-error";
import { fail, ok, type ActionResult } from "./action-result";

export function toActionResult<T>(value: T): ActionResult<T> {
  return ok(value);
}

export function toActionError(error: unknown): ActionError {
  if (error instanceof ActionError) {
    return error;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue ? firstIssue.message : "Data tidak valid";
    return new ActionError("VALIDATION_ERROR", message, 400);
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return new ActionError("UNAUTHORIZED", "Anda tidak memiliki akses untuk aksi ini", 401);
    }

    return new ActionError("INTERNAL_ERROR", error.message, 500);
  }

  return new ActionError("INTERNAL_ERROR", "Unexpected error", 500);
}

export async function wrapAction<T>(callback: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await callback());
  } catch (error) {
    return fail(toActionError(error));
  }
}
