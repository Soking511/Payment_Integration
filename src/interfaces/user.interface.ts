import { Document } from "mongoose";

export interface IUser extends Document {
  _id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  role: IRole;
}

export type IRole = "admin" | "user" | "guest";
