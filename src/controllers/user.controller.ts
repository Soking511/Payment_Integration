import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { generateAccessToken } from './auth.controller';
import { User } from '../model/user.model';
import bcrypt from 'bcrypt';
import { IUser } from '../interfaces/user.interface';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name } = req.body as IUser;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    const token = generateAccessToken(user);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as IUser;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Incorrect email or password');
    }

    const token = generateAccessToken(user);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    res.status(200).json({ message: 'User found', data: userId });
  } catch (error) {
    next(error);
  }
};
