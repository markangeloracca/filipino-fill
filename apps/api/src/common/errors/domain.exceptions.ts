/**
 * Transport-agnostic domain errors. Services throw these; the global
 * exception filter maps them to HTTP status codes and a stable error envelope.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntityNotFoundException extends DomainException {
  readonly code = 'NOT_FOUND';
  readonly status = 404;

  constructor(entity: string, id: string) {
    super(`${entity} not found`, { entity, id });
  }
}

export class DomainConflictException extends DomainException {
  readonly code = 'CONFLICT';
  readonly status = 409;
}

export class UnauthenticatedException extends DomainException {
  readonly code = 'UNAUTHENTICATED';
  readonly status = 401;
}

export class ForbiddenActionException extends DomainException {
  readonly code = 'FORBIDDEN';
  readonly status = 403;
}

export class EmailNotVerifiedException extends DomainException {
  readonly code = 'EMAIL_NOT_VERIFIED';
  readonly status = 403;

  constructor() {
    super('Verify your email to continue');
  }
}
