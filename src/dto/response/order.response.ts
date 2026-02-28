import { IOrderDocument, IOrderItem } from "@/interface/order.interface";

export interface OrderResponseDto {
  id: string;
  orderCode: string;
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: string;
  status: string;
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO dành cho danh sách đơn hàng (Rút gọn để tối ưu hiệu năng)
 */
export class OrderListResponseDto {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  itemCount: number;

  constructor(order: IOrderDocument) {
    this.id = order.id;
    this.orderCode = order.orderCode;
    this.totalAmount = order.totalAmount;
    this.status = order.status;
    this.orderDate = new Date(order.orderDate).toLocaleDateString("vi-VN");
    this.itemCount = order.items.length;
  }
}
