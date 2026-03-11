export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function badRequest(message: string) {
  return new ApiError(400, message);
}

export function unauthorized(message = "Authentication required.") {
  return new ApiError(401, message);
}

export function forbidden(message = "You do not have access to this resource.") {
  return new ApiError(403, message);
}

export function notFound(message = "Resource not found.") {
  return new ApiError(404, message);
}

export function conflict(message: string) {
  return new ApiError(409, message);
}
