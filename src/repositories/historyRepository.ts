import { Pool } from "pg";
import { GetHistoryOrdersQuery } from "../schemas/historySchema.js";

export class HistoryRepository {
  constructor(private pool: Pool) {}

  async findOrderHistory(
    userId: string,
    userRole: string | string[],
    filters: GetHistoryOrdersQuery,
  ) {
    const offset = (filters.page - 1) * filters.limit;
    const queryParams: any[] = [];
    const conditions: string[] = [];

    // 🟢 1. PENGECEKAN HAK AKSES ROLE
    // Konversi masukan role menjadi array string kapital
    const rolesArray = Array.isArray(userRole)
      ? userRole.map((r) => String(r).toUpperCase())
      : [String(userRole || "").toUpperCase()];

    // Cek apakah ada role yang berhak melihat SEMUA data pengajuan
    const canViewAll = rolesArray.some((role) =>
      [
        "APPROVER_KAKANWIL",
        "SUPER_ADMIN",
        "ADMIN_TRAVEL_KP",
        "ASDEP_KEUANGAN",
      ].includes(role),
    );

    // Jika BUKAN role yang berhak melihat semua (misal hanya OFFICIAL_BOOKER), filter berdasarkan booker_id
    if (!canViewAll) {
      queryParams.push(userId);
      conditions.push(`tro.booker_id = $${queryParams.length}`);
    }

    // 🟢 2. FILTER SEARCH
    if (filters.search && filters.search.trim() !== "") {
      queryParams.push(`%${filters.search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(tro.to_code) LIKE $${queryParams.length}
        OR LOWER(tro.activity_name) LIKE $${queryParams.length}
        OR LOWER(tro.sprin_number) LIKE $${queryParams.length}
      )`);
    }

    // 🟢 3. FILTER STATUS
    if (filters.status && filters.status !== "ALL") {
      queryParams.push(filters.status);
      conditions.push(`tro.status = $${queryParams.length}`);
    }

    // 🟢 4. FILTER UNIT KERJA
    if (filters.unitKerjaKode) {
      queryParams.push(filters.unitKerjaKode);
      conditions.push(`tro.unit_kerja_kode = $${queryParams.length}`);
    }

    // 🟢 5. FILTER TANGGAL
    if (filters.startDate && filters.endDate) {
      queryParams.push(filters.startDate, filters.endDate);
      conditions.push(
        `tro.order_date BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(tro.id) AS total 
      FROM travel_orders tro 
      ${whereClause}
    `;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = parseInt(countRes.rows[0]?.total || "0", 10);

    queryParams.push(filters.limit, offset);
    const limitOffsetClause = `LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const dataQuery = `
      SELECT 
        tro.id,
        tro.to_code AS "toCode",
        tro.activity_name AS "activityName",
        tro.unit_kerja_kode AS "unitKerjaKode",
        tro.unit_kerja_nama AS "unitKerjaNama",
        tro.sprin_number AS "sprinNumber",
        tro.order_date AS "orderDate",
        tro.status,
        tro.total_estimated_cost AS "totalEstimatedCost",
        tro.created_at AS "createdAt",
        
        u_booker.nama_lengkap AS "bookerNama",  
        u_booker.npk AS "bookerNpk",

        (
          SELECT COUNT(ot.id) 
          FROM order_transports ot 
          WHERE ot.travel_order_id = tro.id
        ) AS "totalTravellers",

        (
          SELECT COALESCE(SUM(oh.room_count), 0) 
          FROM order_hotels oh 
          WHERE oh.travel_order_id = tro.id
        ) AS "totalHotelRooms"

      FROM travel_orders tro
      LEFT JOIN users u_booker ON tro.booker_id = u_booker.id
      ${whereClause}
      ORDER BY tro.created_at DESC
      ${limitOffsetClause}
    `;

    const res = await this.pool.query(dataQuery, queryParams);

    return {
      items: res.rows,
      meta: {
        totalData,
        currentPage: filters.page,
        totalPages: Math.ceil(totalData / filters.limit),
        limit: filters.limit,
      },
    };
  }
}
