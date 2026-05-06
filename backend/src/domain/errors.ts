/**
 * Domain-level errors. Mapped to HTTP responses by the API layer.
 */

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    super(
      "not_found",
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      404,
    );
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super("forbidden", message, 403);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super("unauthorized", message, 401);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("conflict", message, 409);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("validation_error", message, 400, details);
  }
}
