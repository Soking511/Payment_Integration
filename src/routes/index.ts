import { Request, Response, Application, NextFunction } from "express";
import userRouter from "./user.routes";
import paymentRouter from "./payment.routes";
import webhookRouter from "./webhook.route";
import globalErrors from "../middleware/globalErrors.middleware";
import { ApiError } from "../utils/apiError";
import { IUser } from "../interfaces/user.interface";

const mountRoutes = (app: Application): void => {
  app.use('/api/users', userRouter);
  app.use('/api/payments', paymentRouter);

  // Handle undefined Routes
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
  });

  app.use(globalErrors);
};

export default mountRoutes;