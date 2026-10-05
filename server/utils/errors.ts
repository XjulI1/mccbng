import { ZodError } from 'zod'
import { defineEventHandler, getRequestURL, setResponseStatus, type EventHandlerRequest, type EventHandler, type H3Event } from 'h3'

export class HttpError extends Error {
  constructor(public statusCode: number, public errorName: string, message: string) {
    super(message)
  }
}

export const badRequest = (message: string) => new HttpError(400, 'BadRequestError', message)
export const unauthorized = (message: string) => new HttpError(401, 'UnauthorizedError', message)
export const forbidden = (message: string) => new HttpError(403, 'ForbiddenError', message)
export const notFound = (message: string) => new HttpError(404, 'NotFoundError', message)
export const methodNotAllowed = (message: string) => new HttpError(405, 'MethodNotAllowedError', message)
export const conflict = (message: string) => new HttpError(409, 'ConflictError', message)
export const unprocessable = (message: string) => new HttpError(422, 'UnprocessableEntityError', message)
export const tooManyRequests = (message: string) => new HttpError(429, 'TooManyRequestsError', message)

export interface ErrorBody { error: { statusCode: number; name: string; message: string } }

const NAMES: Record<number, string> = {
  400: 'BadRequestError', 401: 'UnauthorizedError', 403: 'ForbiddenError', 404: 'NotFoundError',
  405: 'MethodNotAllowedError', 409: 'ConflictError', 413: 'PayloadTooLargeError', 422: 'UnprocessableEntityError',
  429: 'TooManyRequestsError', 500: 'InternalServerError'
}

// Convertit n'importe quelle erreur en { statusCode, body } au format uniforme de l'API.
export const toErrorBody = (error: unknown, logContext = ''): { statusCode: number; body: ErrorBody } => {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, body: { error: { statusCode: error.statusCode, name: error.errorName, message: error.message } } }
  }
  if (error instanceof ZodError) {
    const message = error.issues.map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
    return { statusCode: 422, body: { error: { statusCode: 422, name: 'UnprocessableEntityError', message } } }
  }
  // Erreurs h3 (createError, JSON invalide…) : porteuses d'un statusCode 4xx
  const status = (error as { statusCode?: number })?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return {
      statusCode: status,
      body: { error: { statusCode: status, name: NAMES[status] ?? 'Error', message: (error as Error).message || 'Bad request' } }
    }
  }
  console.error('[api]', logContext, error)
  return { statusCode: 500, body: { error: { statusCode: 500, name: NAMES[500]!, message: 'Internal Server Error' } } }
}

export const errorResponse = (event: H3Event, error: unknown): ErrorBody => {
  const { statusCode, body } = toErrorBody(error, `${event.method} ${getRequestURL(event).pathname}`)
  setResponseStatus(event, statusCode)
  return body
}

// Équivalent de defineEventHandler qui garantit le format d'erreur { error: { statusCode, name, message } }.
export const defineApiHandler = <T = unknown>(handler: (event: H3Event<EventHandlerRequest>) => T | Promise<T>): EventHandler<EventHandlerRequest, Promise<T | ErrorBody>> =>
  defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      return errorResponse(event, error)
    }
  })
