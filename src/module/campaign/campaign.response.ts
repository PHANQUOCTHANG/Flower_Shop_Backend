export class CampaignItemResponse {
  id: string;
  productId: string;
  discountValue: number;
  discountType: string;
  salePrice: number;
  limitQuantity: number | null;
  soldQuantity: number;
  product?: any;

  constructor(item: any) {
    this.id = item.id;
    this.productId = item.productId;
    this.discountValue = Number(item.discountValue);
    this.discountType = item.discountType;
    this.salePrice = Number(item.salePrice);
    this.limitQuantity = item.limitQuantity;
    this.soldQuantity = item.soldQuantity;
    this.product = item.product;
  }
}

export class CampaignResponse {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  isActive: boolean;
  items?: CampaignItemResponse[];

  constructor(campaign: any) {
    this.id = campaign.id;
    this.name = campaign.name;
    this.description = campaign.description;
    this.type = campaign.type;
    this.status = campaign.status;
    this.startDate = campaign.startDate.toISOString();
    this.endDate = campaign.endDate.toISOString();
    this.bannerUrl = campaign.bannerUrl;
    this.isActive = campaign.isActive;
    if (campaign.items) {
      this.items = campaign.items.map((i: any) => new CampaignItemResponse(i));
    }
  }
}
