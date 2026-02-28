import { IOrder, IOrderDocument } from "@/interface/order.interface";
import Order from "@/models/order.model";
import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { UpdateQuery } from "mongoose";

export interface IOrderRepository {
  create(data: Partial<IOrder>): Promise<IOrderDocument>;
  findAll(
    query: BaseQuery,
    filter?: object,
  ): Promise<IPaginatedResult<IOrderDocument>>;
  findById(id: string): Promise<IOrderDocument | null>;
  updateById(
    id: string,
    data: UpdateQuery<IOrder>,
  ): Promise<IOrderDocument | null>;
}

export class OrderRepository implements IOrderRepository {
  // Tạo đơn hàng mới
  async create(data: Partial<IOrder>): Promise<IOrderDocument> {
    return Order.create(data);
  }

  // Lấy danh sách kèm phân trang và thông tin khách hàng
  async findAll(
    query: BaseQuery,
    filter: object = {},
  ): Promise<IPaginatedResult<IOrderDocument>> {
    const { page = 1, limit = 10, sort } = query;

    const [data, total] = await Promise.all([
      Order.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "fullName"),
      Order.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm chi tiết đơn hàng kèm thông tin liên hệ đầy đủ
  async findById(id: string): Promise<IOrderDocument | null> {
    return Order.findById(id).populate("userId", "fullName email phone");
  }

  // Cập nhật đơn hàng (trạng thái, thông tin vận chuyển, thanh toán)
  async updateById(
    id: string,
    data: UpdateQuery<IOrder>,
  ): Promise<IOrderDocument | null> {
    return Order.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}
