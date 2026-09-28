import { Pool } from "pg";
import { TravelEditOrderRepository } from "../repositories/travelEditOrderRepository.ts";
import { UpdateTravelOrderCorrectionInput } from "../schemas/travelEditOrderSchema.ts";

export class TravelEditOrderService {
  constructor(
    private editRepo: TravelEditOrderRepository,
    private pool: Pool
  ) {}

  // 1. Fetch Data Koreksi Khusus Editable Format
  async getOrderForCorrection(identifier: string) {
    const data = await this.editRepo.getCorrectionDetail(identifier);
    if (!data) {
      throw new Error(`Travel Order '${identifier}' tidak ditemukan.`);
    }
    return data;
  }

  // 2. Submit Koreksi dengan Transaksi DB
  async submitOrderCorrection(input: UpdateTravelOrderCorrectionInput, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.editRepo.updateAndResubmit(client, input, userId);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}