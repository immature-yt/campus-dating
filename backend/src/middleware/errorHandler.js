export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  // Basic error handler for API responses
  // Avoid leaking internal errors
  const status = err.status || 500;
  const message = err.publicMessage || 'Internal server error';
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: message });
}


