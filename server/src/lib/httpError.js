// An error that carries an HTTP status. Code deep inside a request can
// `throw new HttpError(404, 'Service not found')` and the central error
// handler in app.js sends that status and message as JSON.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
