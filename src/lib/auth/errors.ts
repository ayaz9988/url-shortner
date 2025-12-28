export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AuthError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AuthError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class TokenError extends AuthError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 403);
    this.name = 'TokenError';
  }
}

export class UserNotFoundError extends AuthError {
  constructor(message: string = 'User not found') {
    super(message, 404);
    this.name = 'UserNotFoundError';
  }
}

export class PasswordMismatchError extends AuthError {
  constructor(message: string = 'Current password is incorrect') {
    super(message, 400);
    this.name = 'PasswordMismatchError';
  }
}

export class PasswordValidationError extends AuthError {
  constructor(message: string = 'Password validation failed') {
    super(message, 400);
    this.name = 'PasswordValidationError';
  }
}