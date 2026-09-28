import { Pool } from "pg";
import { ReportHotelQueryParams, ReportTransportQueryParams } from "../schemas/reportSchema.ts";

export class ReportRepository {
  constructor(private pool: Pool) {}

  // ====================================================================
  // 1. LAPORAN AKOMODASI (HOTEL)
  // ====================================================================
  async getHotelReportStats(params: ReportHotelQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.unitKerjaKode) {
      conditions.push(`tro.unit_kerja_kode = $${paramIndex++}`);
      queryParams.push(params.unitKerjaKode);
    }
    if (params.cityId) {
      conditions.push(`oh.city_id = $${paramIndex++}`);
      queryParams.push(params.cityId);
    }
    if (params.status) {
      conditions.push(`tro.status = $${paramIndex++}`);
      queryParams.push(params.status);
    }
    if (params.period) {
      conditions.push(`TO_CHAR(oh.check_in_date, 'YYYY-MM') = $${paramIndex++}`);
      queryParams.push(params.period);
    }
    if (params.keyword) {
      if (params.searchCategory === "hotelName") {
        conditions.push(`(mh.name ILIKE $${paramIndex} OR oh.hotel_name_custom ILIKE $${paramIndex})`);
      } else if (params.searchCategory === "guestName") {
        conditions.push(`EXISTS (SELECT 1 FROM order_hotel_guests ohg WHERE ohg.order_hotel_id = oh.id AND ohg.guest_name ILIKE $${paramIndex})`);
      } else if (params.searchCategory === "toCode") {
        conditions.push(`tro.to_code ILIKE $${paramIndex}`);
      }
      queryParams.push(`%${params.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT 
        COUNT(DISTINCT oh.id)::INT AS "totalReservasi",
        COALESCE(SUM(oh.room_count), 0)::INT AS "totalKamar",
        COALESCE(SUM(oh.room_count * oh.duration_nights), 0)::INT AS "totalRoomNights",
        COALESCE(SUM(oh.subtotal_price), 0)::NUMERIC AS "totalBebanHotel",
        ROUND(COALESCE(AVG(oh.price_per_night), 0), 2)::NUMERIC AS "rataRataTarifMalam",
        ROUND(COALESCE(AVG(oh.duration_nights), 0), 1)::FLOAT AS "rataRataMalam",
        ROUND(COALESCE(SUM(oh.room_count)::NUMERIC / NULLIF(COUNT(DISTINCT oh.id), 0), 0), 2)::FLOAT AS "rasioKamarPerReservasi"
      FROM order_hotels oh
      JOIN travel_orders tro ON oh.travel_order_id = tro.id
      LEFT JOIN master_hotels mh ON oh.hotel_id = mh.id
      WHERE ${whereClause};
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows[0];
  }

  async getHotelReportList(params: ReportHotelQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.unitKerjaKode) {
      conditions.push(`tro.unit_kerja_kode = $${paramIndex++}`);
      queryParams.push(params.unitKerjaKode);
    }
    if (params.cityId) {
      conditions.push(`oh.city_id = $${paramIndex++}`);
      queryParams.push(params.cityId);
    }
    if (params.status) {
      conditions.push(`tro.status = $${paramIndex++}`);
      queryParams.push(params.status);
    }
    if (params.period) {
      conditions.push(`TO_CHAR(oh.check_in_date, 'YYYY-MM') = $${paramIndex++}`);
      queryParams.push(params.period);
    }
    if (params.keyword) {
      if (params.searchCategory === "hotelName") {
        conditions.push(`(mh.name ILIKE $${paramIndex} OR oh.hotel_name_custom ILIKE $${paramIndex})`);
      } else if (params.searchCategory === "guestName") {
        conditions.push(`EXISTS (SELECT 1 FROM order_hotel_guests ohg WHERE ohg.order_hotel_id = oh.id AND ohg.guest_name ILIKE $${paramIndex})`);
      } else if (params.searchCategory === "toCode") {
        conditions.push(`tro.to_code ILIKE $${paramIndex}`);
      }
      queryParams.push(`%${params.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    const countQuery = `
      SELECT COUNT(DISTINCT oh.id)::INT AS total 
      FROM order_hotels oh 
      JOIN travel_orders tro ON oh.travel_order_id = tro.id
      LEFT JOIN master_hotels mh ON oh.hotel_id = mh.id
      WHERE ${whereClause};
    `;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT 
        oh.id,
        tro.to_code AS "toCode",
        COALESCE(mh.name, oh.hotel_name_custom) AS "hotelName",
        mh.star_rating AS "starRating",
        mc.name AS "cityName",
        TO_CHAR(oh.check_in_date, 'YYYY-MM-DD') AS "checkInDate",
        TO_CHAR(oh.check_out_date, 'YYYY-MM-DD') AS "checkOutDate",
        oh.duration_nights AS "durationNights",
        oh.room_count AS "roomCount",
        oh.price_per_night AS "pricePerNight",
        oh.subtotal_price AS "subtotalPrice"
      FROM order_hotels oh
      JOIN travel_orders tro ON oh.travel_order_id = tro.id
      LEFT JOIN master_hotels mh ON oh.hotel_id = mh.id
      LEFT JOIN master_cities mc ON oh.city_id = mc.id
      WHERE ${whereClause}
      ORDER BY oh.check_in_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [...queryParams, params.limit, offset]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit),
      data: dataRes.rows,
    };
  }

  // ====================================================================
  // 2. LAPORAN TRANSPORTASI
  // ====================================================================
  async getTransportReportStats(params: ReportTransportQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.unitKerjaKode) {
      conditions.push(`tro.unit_kerja_kode = $${paramIndex++}`);
      queryParams.push(params.unitKerjaKode);
    }
    if (params.budgetId) {
      conditions.push(`tro.budget_id = $${paramIndex++}`);
      queryParams.push(params.budgetId);
    }
    if (params.status) {
      conditions.push(`tro.status = $${paramIndex++}`);
      queryParams.push(params.status);
    }
    if (params.category) {
      conditions.push(`ot.category = $${paramIndex++}`);
      queryParams.push(params.category);
    }
    if (params.startDate && params.endDate) {
      conditions.push(`ot.departure_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
      queryParams.push(params.startDate, params.endDate);
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT 
        COUNT(DISTINCT tro.id)::INT AS "totalPengajuan",
        COUNT(DISTINCT CASE WHEN tro.status = 'APPROVED' THEN tro.id END)::INT AS "disetujuiResmi",
        COUNT(DISTINCT CASE WHEN tro.status = 'WAITING_PEJABAT' THEN tro.id END)::INT AS "menunggu",
        COUNT(DISTINCT CASE WHEN tro.status = 'REJECTED' THEN tro.id END)::INT AS "ditolak",
        COUNT(DISTINCT ot.id)::INT AS "totalPersonel",
        COUNT(DISTINCT CASE WHEN ot.category = 'INTERNAL' THEN ot.id END)::INT AS "internalBPJS",
        COUNT(DISTINCT CASE WHEN ot.category = 'EKSTERNAL' THEN ot.id END)::INT AS "eksternalTamu",
        COALESCE(SUM(ot.estimated_price), 0)::NUMERIC AS "realisasiAnggaran"
      FROM order_transports ot
      JOIN travel_orders tro ON ot.travel_order_id = tro.id
      WHERE ${whereClause};
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows[0];
  }

  async getTransportReportList(params: ReportTransportQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.unitKerjaKode) {
      conditions.push(`tro.unit_kerja_kode = $${paramIndex++}`);
      queryParams.push(params.unitKerjaKode);
    }
    if (params.budgetId) {
      conditions.push(`tro.budget_id = $${paramIndex++}`);
      queryParams.push(params.budgetId);
    }
    if (params.status) {
      conditions.push(`tro.status = $${paramIndex++}`);
      queryParams.push(params.status);
    }
    if (params.category) {
      conditions.push(`ot.category = $${paramIndex++}`);
      queryParams.push(params.category);
    }
    if (params.transportType) {
      conditions.push(`ot.transport_type = $${paramIndex++}`);
      queryParams.push(params.transportType);
    }
    if (params.startDate && params.endDate) {
      conditions.push(`ot.departure_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
      queryParams.push(params.startDate, params.endDate);
    }
    if (params.keyword) {
      if (params.searchCategory === "guestName") {
        conditions.push(`ot.guest_name ILIKE $${paramIndex}`);
      } else if (params.searchCategory === "npk") {
        conditions.push(`ot.npk_or_ktp ILIKE $${paramIndex}`);
      } else if (params.searchCategory === "toCode") {
        conditions.push(`tro.to_code ILIKE $${paramIndex}`);
      }
      queryParams.push(`%${params.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    const countQuery = `
      SELECT COUNT(ot.id)::INT AS total 
      FROM order_transports ot 
      JOIN travel_orders tro ON ot.travel_order_id = tro.id 
      WHERE ${whereClause};
    `;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT 
        ot.id,
        TO_CHAR(ot.created_at, 'YYYY-MM-DD') AS "tglRekam",
        tro.to_code AS "toCode",
        ot.guest_name AS "guestName",
        ot.npk_or_ktp AS "npkOrKtp",
        ot.jabatan,
        ot.category,
        ot.route_info AS "routeInfo",
        TO_CHAR(ot.departure_date, 'YYYY-MM-DD') AS "departureDate",
        TO_CHAR(ot.return_date, 'YYYY-MM-DD') AS "returnDate",
        ot.is_round_trip AS "isRoundTrip",
        ot.transport_type AS "transportType",
        ot.maskapai,
        ot.estimated_price AS "estimatedPrice"
      FROM order_transports ot
      JOIN travel_orders tro ON ot.travel_order_id = tro.id
      WHERE ${whereClause}
      ORDER BY ot.departure_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [...queryParams, params.limit, offset]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit),
      data: dataRes.rows,
    };
  }

  // Compositions & Corridor aggregations for transport report footer
  async getTransportAnalytics() {
    const compositionQuery = `
      SELECT 
        transport_type AS "transportType",
        COUNT(id)::INT AS "count",
        ROUND((COUNT(id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM order_transports), 0)) * 100, 1)::FLOAT AS "percentage"
      FROM order_transports
      GROUP BY transport_type;
    `;

    const corridorsQuery = `
      SELECT 
        route_info AS "route",
        COUNT(id)::INT AS "volumePersonel"
      FROM order_transports
      WHERE route_info IS NOT NULL
      GROUP BY route_info
      ORDER BY "volumePersonel" DESC
      LIMIT 3;
    `;

    const compRes = await this.pool.query(compositionQuery);
    const corridorRes = await this.pool.query(corridorsQuery);

    return {
      compositions: compRes.rows,
      topCorridors: corridorRes.rows,
    };
  }
}