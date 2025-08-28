import { NextFunction, Request, Response } from 'express';
import  * as yup  from 'yup';
const validate = (schema: yup.ObjectSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validate(req.body);
    next();
  } catch (err: any) {
    res.status(400).json({ error: err.errors });
  }
};

export default validate;