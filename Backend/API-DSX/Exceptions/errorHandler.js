function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro ao processar solicitação';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
