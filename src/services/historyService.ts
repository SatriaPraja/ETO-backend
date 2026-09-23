import { HistoryRepository } from '../repositories/historyRepository.ts'
import { GetHistoryOrdersQuery } from '../schemas/historySchema.ts'

export class HistoryService {
  constructor(private historyRepo: HistoryRepository) {}

  async getOrderHistory(userId: string, userRole: string, query: GetHistoryOrdersQuery) {
    return await this.historyRepo.findOrderHistory(userId, userRole, query)
  }
}