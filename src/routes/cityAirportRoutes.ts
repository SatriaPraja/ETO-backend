import { Router } from "express";
import { Pool } from "pg";
import { CityAirportRepository } from "../repositories/cityAirportRepository";
import { CityAirportService } from "../services/cityAirportService";
import { CityAirportController } from "../controllers/cityAirportController";

export function createCityAirportRouter(pool: Pool): Router {
  const router = Router();

  // Dependency Injection
  const repository = new CityAirportRepository(pool);
  const service = new CityAirportService(repository);
  const controller = new CityAirportController(service);

  // Stats Endpoint
  router.get("/master/cities-airports/stats", controller.getKpiStats);

  // City Endpoints
  router.get("/master/cities", controller.getCities);
  router.get("/master/cities/:id", controller.getCityById);
  router.post("/master/cities", controller.createCity);
  router.put("/master/cities/:id", controller.updateCity);
  router.delete("/master/cities/:id", controller.deleteCity);

  // Airport Endpoints
  router.get("/master/airports", controller.getAirports);
  router.get("/master/airports/:id", controller.getAirportById);
  router.post("/master/airports", controller.createAirport);
  router.put("/master/airports/:id", controller.updateAirport);
  router.delete("/master/airports/:id", controller.deleteAirport);

  return router;
}