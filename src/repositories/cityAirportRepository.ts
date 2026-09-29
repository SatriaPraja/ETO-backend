import { Pool } from "pg";
import {
  CityAirportQueryParams,
  CreateCityDTO,
  UpdateCityDTO,
  CreateAirportDTO,
  UpdateAirportDTO,
} from "../schemas/cityAirportSchema";

export class CityAirportRepository {
  constructor(private pool: Pool) {}

  // 1. KPI Stats
  async getKpiStats() {
    const query = `
      SELECT 
        (SELECT COUNT(*)::INT FROM master_cities) AS "totalCities",
        (SELECT COUNT(*)::INT FROM master_airports) AS "totalAirports",
        (SELECT COUNT(*)::INT FROM master_airports WHERE is_active = TRUE) AS "activeAirports",
        (SELECT COUNT(*)::INT FROM master_airports WHERE is_active = FALSE) AS "inactiveAirports",
        (
          SELECT JSON_BUILD_OBJECT('name', province, 'count', COUNT(*)::INT)
          FROM master_cities
          WHERE province IS NOT NULL AND province != ''
          GROUP BY province
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS "topProvince";
    `;

    const res = await this.pool.query(query);
    const row = res.rows[0];

    return {
      totalCities: row?.totalCities || 0,
      totalAirports: row?.totalAirports || 0,
      activeAirports: row?.activeAirports || 0,
      inactiveAirports: row?.inactiveAirports || 0,
      topProvince: row?.topProvince || { name: "-", count: 0 },
    };
  }

  // ==========================================
  // CITIES DOMAIN
  // ==========================================

  async getCities(params: CityAirportQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(mc.code ILIKE $${paramIndex} OR mc.name ILIKE $${paramIndex} OR mc.province ILIKE $${paramIndex})`
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status && params.status !== "all") {
      conditions.push(`mc.is_active = $${paramIndex++}`);
      queryParams.push(params.status === "active");
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    const countQuery = `SELECT COUNT(*)::INT AS total FROM master_cities mc WHERE ${whereClause};`;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT 
        mc.id,
        mc.code,
        mc.name,
        mc.province,
        mc.is_active AS "isActive",
        mc.created_at AS "createdAt",
        COUNT(ma.id)::INT AS "airportsCount"
      FROM master_cities mc
      LEFT JOIN master_airports ma ON mc.id = ma.city_id
      WHERE ${whereClause}
      GROUP BY mc.id
      ORDER BY mc.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [
      ...queryParams,
      params.limit,
      offset,
    ]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit) || 1,
      data: dataRes.rows,
    };
  }

  async getCityById(id: number) {
    const query = `
      SELECT id, code, name, province, is_active AS "isActive", created_at AS "createdAt"
      FROM master_cities WHERE id = $1;
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  async createCity(dto: CreateCityDTO) {
    const query = `
      INSERT INTO master_cities (code, name, province, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, code, name, province, is_active AS "isActive", created_at AS "createdAt";
    `;
    const res = await this.pool.query(query, [
      dto.code,
      dto.name,
      dto.province,
      dto.isActive ?? true,
    ]);
    return res.rows[0];
  }

  async updateCity(id: number, dto: UpdateCityDTO) {
    const query = `
      UPDATE master_cities
      SET 
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        province = COALESCE($3, province),
        is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING id, code, name, province, is_active AS "isActive";
    `;
    const res = await this.pool.query(query, [
      dto.code,
      dto.name,
      dto.province,
      dto.isActive,
      id,
    ]);
    return res.rows[0] || null;
  }

  async deleteCity(id: number) {
    const res = await this.pool.query(
      `DELETE FROM master_cities WHERE id = $1 RETURNING id;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // AIRPORTS DOMAIN
  // ==========================================

  async getAirports(params: CityAirportQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(ma.code ILIKE $${paramIndex} OR ma.name ILIKE $${paramIndex} OR mc.name ILIKE $${paramIndex})`
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status && params.status !== "all") {
      conditions.push(`ma.is_active = $${paramIndex++}`);
      queryParams.push(params.status === "active");
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    const countQuery = `
      SELECT COUNT(*)::INT AS total 
      FROM master_airports ma 
      LEFT JOIN master_cities mc ON ma.city_id = mc.id 
      WHERE ${whereClause};
    `;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT 
        ma.id,
        ma.code,
        ma.name,
        ma.city_id AS "cityId",
        mc.name AS "cityName",
        mc.province AS "provinceName",
        ma.is_active AS "isActive"
      FROM master_airports ma
      LEFT JOIN master_cities mc ON ma.city_id = mc.id
      WHERE ${whereClause}
      ORDER BY ma.code ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [
      ...queryParams,
      params.limit,
      offset,
    ]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit) || 1,
      data: dataRes.rows,
    };
  }

  async getAirportById(id: number) {
    const query = `
      SELECT 
        ma.id, ma.code, ma.name, ma.city_id AS "cityId", 
        mc.name AS "cityName", ma.is_active AS "isActive"
      FROM master_airports ma
      LEFT JOIN master_cities mc ON ma.city_id = mc.id
      WHERE ma.id = $1;
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  async createAirport(dto: CreateAirportDTO) {
    const query = `
      INSERT INTO master_airports (code, name, city_id, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, code, name, city_id AS "cityId", is_active AS "isActive";
    `;
    const res = await this.pool.query(query, [
      dto.code,
      dto.name,
      dto.cityId,
      dto.isActive ?? true,
    ]);
    return this.getAirportById(res.rows[0].id);
  }

  async updateAirport(id: number, dto: UpdateAirportDTO) {
    const query = `
      UPDATE master_airports
      SET 
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        city_id = COALESCE($3, city_id),
        is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING id;
    `;
    await this.pool.query(query, [
      dto.code,
      dto.name,
      dto.cityId,
      dto.isActive,
      id,
    ]);
    return this.getAirportById(id);
  }

  async deleteAirport(id: number) {
    const res = await this.pool.query(
      `DELETE FROM master_airports WHERE id = $1 RETURNING id;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}