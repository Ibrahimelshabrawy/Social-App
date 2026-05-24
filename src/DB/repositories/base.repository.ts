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
    const query = this.model
      .findOne(filter, projection)
      .sort(options?.sort)
      .select(projection!)
      .populate(options?.populate as PopulateOptions | PopulateOptions[]);
    if (options?.lean) {
      query.lean();
    }
    return query.exec();
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
    const query = this.model
      .findById(id, projection)
      .populate(options?.populate as PopulateOptions | PopulateOptions[])
      .select(projection!);

    if (options?.lean) {
      query.lean();
    }
    return query.exec();
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
    id: Types.ObjectId;
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
    id: Types.ObjectId;
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

  async paginate<T>({
    page,
    limit,
    sort,
    search,
    populate,
  }: {
    page?: number;
    limit?: number;
    sort?: any;
    populate?: any;
    search?: QueryFilter<T>;
  }) {
    page = +page! || 1;
    limit = +limit! || 1;

    if (page < 1) page = 1;
    if (limit < 1) limit = 1;

    const skip = (page - 1) * limit;

    const [data, totalDocuments] = await Promise.all([
      await this.model
        .find({...(search ?? {})})
        .limit(limit)
        .skip(skip)
        .sort(sort)
        .populate(populate)
        .exec(),

      await this.model.countDocuments({...(search ?? {})}),
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);

    return {
      meta: {
        currentPage: page,
        totalPages,
        limit,
        totalDocuments,
      },
      data,
    };
  }
  async updateMany({
    filter,
    update,
  }: {
    filter: QueryFilter<TDocument>;
    update: UpdateQuery<TDocument>;
  }) {
    return this.model.updateMany(filter, update);
  }
  async deleteMany({filter}: {filter: QueryFilter<TDocument>}) {
    return this.model.deleteMany(filter);
  }
  async deleteOne({filter}: {filter: QueryFilter<TDocument>}) {
    return this.model.deleteOne(filter);
  }
}

export default BaseRepository;
