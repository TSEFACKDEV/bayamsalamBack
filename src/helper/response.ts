import { Response } from 'express';

class ResponseApi {
  static success(res: Response, message: string, data: any, statusCode = 200) {
    return res.status(statusCode).json({
      meta: {
        status: statusCode,
        message: message,
      },
      data: data,
    });
  }

  static error(res: Response, message: string, error: any, statusCode = 500) {
    return res.status(statusCode).json({
      meta: {
        status: statusCode,
        message: message,
      },
      error: error,
    });
  }

  static notFound(res: Response, message = 'Not Found', statusCode = 404) {
    return res.status(statusCode).json({
      meta: {
        status: statusCode,
        message: message,
      },
    });
  }
}

export default ResponseApi;
