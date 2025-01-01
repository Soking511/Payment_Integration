import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import {
  checkUserID,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  registerSchema
} from '../validation/schemas/user.schema';
import { CrudService } from '../services/crud.service';
import { CrudController } from '../controllers/crud.controller';
import { User } from '../model/user.model';
import { login, register } from '../controllers/user.controller';
import { isUserNotLoggedIn, isAuthenticated, hasRole } from '../middleware/auth.middleware';
import { IUserRole } from '../interfaces';

const userRouter = Router();
const userController = new CrudController(new CrudService(User));

// Public routes (no RBAC)
userRouter.post('/login', isUserNotLoggedIn, validate(loginSchema), login);
userRouter.post('/register', validate(registerSchema), register);

// Protected routes
userRouter.route('/')
  .post(
    isAuthenticated,
    hasRole('admin' as IUserRole),
    validate(createUserSchema),
    userController.create
  )
  .get(
    isAuthenticated,
    hasRole('admin' as IUserRole),
    userController.findAll
  );

// Protected routes with ID
userRouter.route('/:id')
  .get(
    isAuthenticated,
    hasRole('admin' as IUserRole),
    validate(checkUserID),
    userController.findById
  )
  .put(
    isAuthenticated,
    hasRole('admin' as IUserRole),
    validate(updateUserSchema),
    userController.update
  )
  .delete(
    isAuthenticated,
    hasRole('admin' as IUserRole),
    validate(checkUserID),
    userController.delete
  );

export default userRouter;
