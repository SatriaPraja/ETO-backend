import { CityAirportRepository } from "../repositories/cityAirportRepository";
import {
  CityAirportQueryParams,
  CreateCityDTO,
  UpdateCityDTO,
  CreateAirportDTO,
  UpdateAirportDTO,
} from "../schemas/cityAirportSchema";

export class CityAirportService {
  constructor(private repo: CityAirportRepository) {}

  async getKpiStats() {
    return await this.repo.getKpiStats();
  }

  // Cities
  async getCities(params: CityAirportQueryParams) {
    return await this.repo.getCities(params);
  }

  async getCityById(id: number) {
    const city = await this.repo.getCityById(id);
    if (!city) throw new Error("Data kota tidak ditemukan");
    return city;
  }

  async createCity(dto: CreateCityDTO) {
    return await this.repo.createCity(dto);
  }

  async updateCity(id: number, dto: UpdateCityDTO) {
    await this.getCityById(id);
    return await this.repo.updateCity(id, dto);
  }

  async deleteCity(id: number) {
    await this.getCityById(id);
    return await this.repo.deleteCity(id);
  }

  // Airports
  async getAirports(params: CityAirportQueryParams) {
    return await this.repo.getAirports(params);
  }

  async getAirportById(id: number) {
    const airport = await this.repo.getAirportById(id);
    if (!airport) throw new Error("Data bandara tidak ditemukan");
    return airport;
  }

  async createAirport(dto: CreateAirportDTO) {
    return await this.repo.createAirport(dto);
  }

  async updateAirport(id: number, dto: UpdateAirportDTO) {
    await this.getAirportById(id);
    return await this.repo.updateAirport(id, dto);
  }

  async deleteAirport(id: number) {
    await this.getAirportById(id);
    return await this.repo.deleteAirport(id);
  }
}