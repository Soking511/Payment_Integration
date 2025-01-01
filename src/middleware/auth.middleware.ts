import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../model/user.model';
import { ApiError } from '../utils/apiError';
import { IUser } from '../interfaces/user.interface';
import { IUserRole } from '../interfaces';

const roleHierarchy: Record<IUserRole, IUserRole[]> = {
  [IUserRole.ADMIN]: [IUserRole.ADMIN, IUserRole.MANAGER, IUserRole.USER],
  [IUserRole.MANAGER]: [IUserRole.MANAGER, IUserRole.USER],
  [IUserRole.USER]: [IUserRole.USER],
};

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IUser;
    const user = await User.findById(decoded._id);

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
};

export const hasRole = (requiredRole: IUserRole) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      if (!user || !user.role) {
        throw new ApiError(403, 'Access denied');
      }

      const allowedRoles = roleHierarchy[user.role as IUserRole];
      if (!allowedRoles.includes(requiredRole)) {
        throw new ApiError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const isUserNotLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.headers.authorization) {
    throw new ApiError(400, 'You are already logged in');
  }
  next();
};
