import { Request, Response, NextFunction } from 'express';
import { BaseEntity, CrudService } from '../services/crud.service';
import { ApiError } from '../utils/apiError';

export class CrudController<T extends BaseEntity> {
  constructor(private readonly service: CrudService<T>) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.service.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          errors: Array.isArray(error.message)
            ? error.message.map(msg => ({ message: msg }))
            : [{ message: error.message }]
        });
      } else {
        next(error);
      }
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const items = await this.service.findAll().catch(next);
    if (items) {
      res.json(items);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const item = await this.service.findById(req.params.id).catch(next);
    if (!item) {
      return next(new ApiError(404, 'Item not found'));
    }
    res.json(item);
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const item = await this.service.update(req.params.id, req.body).catch(next);
    if (!item) {
      return next(new ApiError(404, 'Item not found'));
    }
    res.json(item);
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const item = await this.service.delete(req.params.id).catch(next);
    if (!item) {
      return next(new ApiError(404, 'Item not found'));
    }
    res.status(204).send();
  };
}