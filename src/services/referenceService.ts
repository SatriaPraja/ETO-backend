import { ReferenceRepository } from '../repositories/referenceRepository'
import { GetOfficialBookersQuery } from '../schemas/referenceSchema'

export class ReferenceService {
  constructor(private refRepo: ReferenceRepository) {}

  async getApprovers(searchQuery?: string) {
    return await this.refRepo.findApprovers(searchQuery)
  }

  async getBudgets(searchQuery?: string) {
    const budgets = await this.refRepo.findBudgets(searchQuery)
    
    // Formatting data jika diperlukan sebelum dikirim ke Controller
    return budgets.map((b) => ({
      ...b,
      paguBudget: parseFloat(b.paguBudget || 0),
      usedBudget: parseFloat(b.usedBudget || 0),
      remainingBudget: parseFloat(b.remainingBudget || 0),
    }))
  }
  async getHotels(searchQuery?: string) {
    return await this.refRepo.findHotels(searchQuery)
  }
  async getOfficialBookers(query: GetOfficialBookersQuery) {
    const bookers = await this.refRepo.findOfficialBookers(query.search)
    return bookers
  }
}