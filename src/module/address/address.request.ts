export interface CreateAddressRequest {
  // Tên người nhận hàng
  name: string;
  // Số điện thoại nhận hàng (10-11 chữ số)
  phone: string;
  // Mã và tên tỉnh/thành phố
  provinceCode: string;
  provinceName: string;
  // Mã và tên quận/huyện
  districtCode: string;
  districtName: string;
  // Mã và tên phường/xã
  wardCode: string;
  wardName: string;
  // Địa chỉ chi tiết (số nhà, tên đường, ...)
  streetDetail: string;
  // Đặt làm địa chỉ mặc định (optional, default: false)
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  name?: string;
  phone?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  streetDetail?: string;
  isDefault?: boolean;
}
