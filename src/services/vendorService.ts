import { VendorRepository } from "../repositories/vendorRepository";
import {
  VendorQueryParams,
  CreateVendorDTO,
  UpdateVendorDTO,
} from "../schemas/vendorSchema";

export class VendorService {
  constructor(private vendorRepo: VendorRepository) {}

  async getVendorDashboard(params: VendorQueryParams) {
    const stats = await this.vendorRepo.getVendorStats();
    const list = await this.vendorRepo.getVendors(params);

    return {
      stats: stats.kpi,
      distribution: stats.distribution,
      pagination: {
        totalData: list.totalData,
        page: list.page,
        limit: list.limit,
        totalPages: list.totalPages,
      },
      vendors: list.data,
    };
  }

  async getVendorById(id: number) {
    const vendor = await this.vendorRepo.getVendorById(id);
    if (!vendor) {
      throw new Error("Data maskapai/vendor tidak ditemukan.");
    }
    return vendor;
  }

  async createVendor(dto: CreateVendorDTO) {
    return await this.vendorRepo.createVendor(dto);
  }

  async updateVendor(id: number, dto: UpdateVendorDTO) {
    await this.getVendorById(id);
    return await this.vendorRepo.updateVendor(id, dto);
  }

  async deleteVendor(id: number) {
    await this.getVendorById(id);
    return await this.vendorRepo.deleteVendor(id);
  }
}
