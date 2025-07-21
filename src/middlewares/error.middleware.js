// Middleware para manejar rutas no encontradas
const notFound = (req, res, next) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware para manejo general de errores
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error('Error detallado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler
};
