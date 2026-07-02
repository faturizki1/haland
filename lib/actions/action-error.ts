export class ActionError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ActionError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createActionError(code: string, message: string, status = 500, details?: unknown) {
  return new ActionError(code, message, status, details);
}
