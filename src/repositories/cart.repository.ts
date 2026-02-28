import { ICartDocument, ICart } from "@/interface/cart.interface";
import Cart from "@/models/cart.model";
import mongoose from "mongoose";

export interface ICartRepository {
  create(userId: string): Promise<ICartDocument>;
  findByUserId(userId: string): Promise<ICartDocument | null>;
  update(cart: ICartDocument): Promise<ICartDocument>;
  clear(userId: string): Promise<void>;
}

export class CartRepository implements ICartRepository {
  // Chuyển đổi userId string thành ObjectId
  private toObjectId(userId: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(userId);
  }

  // Khởi tạo giỏ hàng mới cho người dùng
  async create(userId: string): Promise<ICartDocument> {
    return Cart.create({ userId: this.toObjectId(userId), products: [] });
  }

  // Tìm giỏ hàng theo userId kèm thông tin sản phẩm chi tiết
  async findByUserId(userId: string): Promise<ICartDocument | null> {
    return Cart.findOne({ userId: this.toObjectId(userId) }).populate({
      path: "products.productId",
      select: "name price images slug stock quantity",
    });
  }

  // Lưu lại các thay đổi của giỏ hàng (Cập nhật số lượng, thêm/bớt sp)
  async update(cart: ICartDocument): Promise<ICartDocument> {
    return cart.save();
  }

  // Xóa toàn bộ sản phẩm trong giỏ hàng (Dùng sau khi đặt hàng thành công)
  async clear(userId: string): Promise<void> {
    await Cart.findOneAndUpdate(
      { userId: this.toObjectId(userId) },
      { products: [] },
    );
  }
}
