import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      const uniqueErrors = errors.array().reduce((acc: any[], error: any) => {
        if (!acc.find(e => e.path === error.path)) {
          acc.push(error);
        }
        return acc;
      }, []);

      res.status(400).json({
        success: false,
        errors: uniqueErrors.map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    } catch (error) {
      next(error);
    }
  };
};
