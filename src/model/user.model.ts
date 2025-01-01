import { model, Schema } from "mongoose";
import { IUser, IRole } from "../interfaces/user.interface";

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' as IRole },
});

export const User = model<IUser>('User', UserSchema);