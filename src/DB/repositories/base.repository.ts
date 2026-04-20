import {
  HydratedDocument,
  Model,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from "mongoose";

abstract class BaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  async create({
    data,
  }: {
    data: Partial<TDocument>;
  }): Promise<HydratedDocument<TDocument>> {
    return this.model.create(data);
  }

  async find({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument>[]> {
    return this.model
      .find(filter || {}, projection)
      .sort(options?.sort)
      .skip(options?.skip!)
      .limit(options?.limit!)
      .select(projection!)
      .populate(options?.populate as PopulateOptions | PopulateOptions[]);
  }

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findOne(filter, projection)
      .sort(options?.sort)
      .select(projection!)
      .populate(options?.populate as PopulateOptions | PopulateOptions[]);
  }

  async findById({
    id,
    projection,
    options,
  }: {
    id: string | Types.ObjectId;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findById(id, projection)
      .populate(options?.populate as PopulateOptions | PopulateOptions[])
      .select(projection!)
      .exec();
  }

  async findOneAndUpdate({
    filter,
    update,
    projection,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    update: UpdateQuery<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findOneAndUpdate(filter, update, {
        new: true,
        runValidators: true,
        ...options,
      })
      .select(projection!)
      .exec();
  }

  async findByIdAndUpdate({
    id,
    update,
    projection,
    options,
  }: {
    id: string;
    update: UpdateQuery<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
        ...options,
      })
      .select(projection!);
  }

  async findOneAndDelete({
    filter,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findOneAndDelete(filter)
      .populate(options?.populate as PopulateOptions | PopulateOptions[])
      .exec();
  }

  async findByIdAndDelete({
    id,
    options,
  }: {
    id: string;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findByIdAndDelete(id)
      .populate(options?.populate as PopulateOptions | PopulateOptions[])
      .exec();
  }

  async countDocuments({
    filter,
  }: {
    filter?: QueryFilter<TDocument>;
  }): Promise<number> {
    return this.model.countDocuments(filter || {});
  }
}

export default BaseRepository;
