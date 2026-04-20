import { Request, Response } from "express";
import asyncHandler from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/apiResponse";
import { addressService } from "@/config/container";
import type {
  CreateAddressRequest,
  UpdateAddressRequest,
} from "./address.request";
import { getUserId } from "@/helpers/getUserId";

// [GET] /api/v1/addresses - Lấy danh sách tất cả địa chỉ của người dùng
export const getAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const addresses = await addressService.getAddresses(userId);

    return res
      .status(200)
      .json(ApiResponse.success(addresses, "Lấy danh sách địa chỉ thành công"));
  },
);

// [GET] /api/v1/addresses/:id - Lấy chi tiết một địa chỉ
export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const addressId = req.params.id as string;
  const address = await addressService.getAddress(addressId, userId);

  return res.status(200).json(ApiResponse.success(address));
});

// [POST] /api/v1/addresses - Tạo mới một địa chỉ
export const createAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data: CreateAddressRequest = req.body;

    const address = await addressService.createAddress(userId, data);

    return res
      .status(201)
      .json(ApiResponse.success(address, "Tạo địa chỉ thành công"));
  },
);

// [PATCH] /api/v1/addresses/:id - Cập nhật một địa chỉ
export const updateAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const addressId = req.params.id as string;
    const data: UpdateAddressRequest = req.body;

    const address = await addressService.updateAddress(addressId, userId, data);

    return res
      .status(200)
      .json(ApiResponse.success(address, "Cập nhật địa chỉ thành công"));
  },
);

// [DELETE] /api/v1/addresses/:id - Xóa một địa chỉ
export const deleteAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const addressId = req.params.id as string;

    await addressService.deleteAddress(addressId, userId);

    return res
      .status(200)
      .json(ApiResponse.success(null, "Xóa địa chỉ thành công"));
  },
);

// [PATCH] /api/v1/addresses/:id/set-default - Đặt địa chỉ làm mặc định
export const setDefaultAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const addressId = req.params.id as string;

    const address = await addressService.setDefaultAddress(addressId, userId);

    return res
      .status(200)
      .json(ApiResponse.success(address, "Đặt địa chỉ mặc định thành công"));
  },
);
