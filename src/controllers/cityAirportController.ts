import { Request, Response } from "express";
import { CityAirportService } from "../services/cityAirportService";
import {
  cityAirportQuerySchema,
  createCitySchema,
  updateCitySchema,
  createAirportSchema,
  updateAirportSchema,
} from "../schemas/cityAirportSchema";

export class CityAirportController {
  constructor(private service: CityAirportService) {}

  // Stats
  getKpiStats = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.getKpiStats();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Cities
  getCities = async (req: Request, res: Response) => {
    try {
      const query = cityAirportQuerySchema.parse(req.query);
      const result = await this.service.getCities(query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  getCityById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await this.service.getCityById(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  };

  createCity = async (req: Request, res: Response) => {
    try {
      const dto = createCitySchema.parse(req.body);
      const data = await this.service.createCity(dto);
      return res.status(201).json({ success: true, message: "Kota berhasil ditambahkan", data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  updateCity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const dto = updateCitySchema.parse(req.body);
      const data = await this.service.updateCity(id, dto);
      return res.status(200).json({ success: true, message: "Kota berhasil diperbarui", data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  deleteCity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await this.service.deleteCity(id);
      return res.status(200).json({ success: true, message: "Kota berhasil dihapus" });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  // Airports
  getAirports = async (req: Request, res: Response) => {
    try {
      const query = cityAirportQuerySchema.parse(req.query);
      const result = await this.service.getAirports(query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  getAirportById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await this.service.getAirportById(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  };

  createAirport = async (req: Request, res: Response) => {
    try {
      const dto = createAirportSchema.parse(req.body);
      const data = await this.service.createAirport(dto);
      return res.status(201).json({ success: true, message: "Bandara berhasil ditambahkan", data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  updateAirport = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const dto = updateAirportSchema.parse(req.body);
      const data = await this.service.updateAirport(id, dto);
      return res.status(200).json({ success: true, message: "Bandara berhasil diperbarui", data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  deleteAirport = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await this.service.deleteAirport(id);
      return res.status(200).json({ success: true, message: "Bandara berhasil dihapus" });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };
}