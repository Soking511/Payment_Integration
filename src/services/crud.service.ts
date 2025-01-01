import { Model, Document } from 'mongoose';

export interface BaseEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CrudService<T extends BaseEntity> {
  constructor(private readonly model: Model<T & Document>) {}

  async create(data: Partial<T>): Promise<T> {
    const newItem = new this.model(data);
    return await newItem.save();
  }

  async findAll(filter = {}, select = ''): Promise<T[]> {
    return await this.model.find(filter).select(select);
  }

  async findById(id: string): Promise<T | null> {
    return await this.model.findById(id);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return await this.model.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
  }

  async delete(id: string): Promise<T | null> {
    return await this.model.findByIdAndDelete(id);
  }
}
