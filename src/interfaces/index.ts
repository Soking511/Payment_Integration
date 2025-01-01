export enum IUserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

export interface IPermission {
  name: string;
  description: string;
}

export interface IRole {
  name: IUserRole;
  permissions: string[];
  inherits?: IUserRole[];
}

export interface IPaymentIntent {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
}

export interface IWebhookEvent {
  _id: string;
  type: string;
  data: any;
  idempotencyKey: string;
}

export interface IRateLimitRule {
  windowMs: number;
  max: number;
  message: string;
}
