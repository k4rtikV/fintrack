const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);

  error.statusCode = 404;
  next(error);
};

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "An unexpected server error occurred";
  let details = error.details || null;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Database validation failed";

    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (error.code === 11000) {
    statusCode = 409;

    const duplicatedField = Object.keys(error.keyValue || {})[0];

    message = duplicatedField
      ? `${duplicatedField} is already in use`
      : "A duplicate value already exists";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${error.path}`;
  }

  const response = {
    success: false,
    message,
  };

  if (details) {
    response.errors = details;
  }

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export { errorHandler, notFound };