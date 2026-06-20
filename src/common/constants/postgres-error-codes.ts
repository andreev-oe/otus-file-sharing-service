import { QueryFailedError } from 'typeorm';

export const POSTGRES_FK_VIOLATION_CODE = '23503';

export function isPostgresFkViolation(
  error: unknown,
): error is QueryFailedError {
  return (
    error instanceof QueryFailedError &&
    'code' in error &&
    error.code === POSTGRES_FK_VIOLATION_CODE
  );
}
