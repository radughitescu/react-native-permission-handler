export class PermissionTimeoutError extends Error {
  readonly permission: string;
  readonly timeoutMs: number;

  constructor(permission: string, timeoutMs: number) {
    super(`Permission request for "${permission}" timed out after ${timeoutMs}ms`);
    this.name = "PermissionTimeoutError";
    this.permission = permission;
    this.timeoutMs = timeoutMs;
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  permission: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new PermissionTimeoutError(permission, timeoutMs)),
      timeoutMs,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
