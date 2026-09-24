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
    const rolesArray = Array.isArray(userRole)
      ? userRole.map((r) => String(r).toUpperCase())
      : [String(userRole || "").toUpperCase()];

    // Cek apakah user memiliki role global (bisa melihat SEMUA pengajuan tanpa batasan partisipasi)
    const canViewAll = rolesArray.some((role) =>
      [
        "APPROVER_KAKANWIL",
        "SUPER_ADMIN",
        "ADMIN_TRAVEL_KP",
        "ASDEP_KEUANGAN",
      ].includes(role),
    );

    // 🟢 2. FILTER AKSES PARTISIPASI USER
    // Jika BUKAN role global, tampilkan Travel Order yang user ini ikuti (sebagai Booker, Approver, Traveller, atau Guest Hotel)
    if (!canViewAll) {
      queryParams.push(userId);
      const userParamIdx = `$${queryParams.length}`;

      conditions.push(`(
        tro.booker_id = ${userParamIdx}
        OR tro.approver_id = ${userParamIdx}
        OR EXISTS (
          SELECT 1 
          FROM order_transports ot 
          WHERE ot.travel_order_id = tro.id 
            AND ot.user_id = ${userParamIdx}
        )
        OR EXISTS (
          SELECT 1 
          FROM order_hotels oh
          JOIN order_hotel_guests ohg ON ohg.order_hotel_id = oh.id
          WHERE oh.travel_order_id = tro.id 
            AND ohg.user_id = ${userParamIdx}
        )
      )`);
    }

    // 🟢 3. FILTER SEARCH
    if (filters.search && filters.search.trim() !== "") {
      queryParams.push(`%${filters.search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(tro.to_code) LIKE $${queryParams.length}
        OR LOWER(tro.activity_name) LIKE $${queryParams.length}
        OR LOWER(tro.sprin_number) LIKE $${queryParams.length}
      )`);
    }

    // 🟢 4. FILTER STATUS
    if (filters.status && filters.status !== "ALL") {
      queryParams.push(filters.status);
      conditions.push(`tro.status = $${queryParams.length}`);
    }

    // 🟢 5. FILTER UNIT KERJA
    if (filters.unitKerjaKode) {
      queryParams.push(filters.unitKerjaKode);
      conditions.push(`tro.unit_kerja_kode = $${queryParams.length}`);
    }

    // 🟢 6. FILTER TANGGAL PENGAJUAN
    if (filters.startDate && filters.endDate) {
      queryParams.push(filters.startDate, filters.endDate);
      conditions.push(
        `tro.order_date BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 🟢 QUERY HITUNG TOTAL DATA
    const countQuery = `
      SELECT COUNT(tro.id) AS total 
      FROM travel_orders tro 
      ${whereClause}
    `;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = parseInt(countRes.rows[0]?.total || "0", 10);

    // 🟢 QUERY DATA RIWAYAT + INFORMASI DETAIL
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
  async findOrderDetailByToCode(toCodeStr: string) {
    // Normalisasi format TO (contoh: TO-2026-05-00187 menjadi TO/2026/05/00187)
    const formattedToCode = toCodeStr.replace(/-/g, "/");

    // 1. Query Header Travel Order + Info Anggaran & Pejabat
    // 1. Query Header Travel Order + Info Anggaran & Pejabat
    const headerQuery = `
  SELECT 
    tro.id,
    tro.to_code AS "toCode",
    tro.booker_id AS "bookerId",     
    tro.approver_id AS "approverId", 
    tro.activity_name AS "activityName",
    tro.unit_kerja_kode AS "unitKerjaKode",
    tro.unit_kerja_nama AS "unitKerjaNama",
    tro.sprin_number AS "sprinNumber",
    tro.sprin_detail AS "sprinDetail",
    tro.notes,
    tro.order_date AS "orderDate",
    tro.status,
    tro.total_estimated_cost AS "totalEstimatedCost",
    tro.created_at AS "createdAt",

    u_booker.nama_lengkap AS "bookerNama",
    u_booker.role AS "bookerRole",
    
    u_appr.nama_lengkap AS "approverNama",
    u_appr.jabatan AS "approverJabatan",

    mb.account_number AS "budgetAccountNumber",
    mb.account_name AS "budgetAccountName",
    mb.pagu_budget AS "paguBudget",
    mb.used_budget AS "usedBudget"

  FROM travel_orders tro
  LEFT JOIN users u_booker ON tro.booker_id = u_booker.id
  LEFT JOIN users u_appr ON tro.approver_id = u_appr.id
  LEFT JOIN master_budgets mb ON tro.budget_id = mb.id
  WHERE LOWER(tro.to_code) = LOWER($1)
  LIMIT 1;
`;

    const headerRes = await this.pool.query(headerQuery, [formattedToCode]);
    if (headerRes.rows.length === 0) return null;

    const orderHeader = headerRes.rows[0];
    const travelOrderId = orderHeader.id;

    // 2. Query Manifest Penerbangan / Transportasi
    const transportQuery = `
      SELECT 
        ot.id,
        ot.transport_type AS "transportType",
        ot.category,
        ot.user_id AS "userId",
        ot.guest_name AS "guestName",
        ot.npk_or_ktp AS "npkOrKtp",
        ot.jabatan,
        ot.instansi,
        ot.phone,
        ot.route_info AS "routeInfo",
        ot.departure_info AS "departureInfo",
        ot.return_info AS "returnInfo",
        ot.maskapai,
        ot.departure_date AS "departureDate",
        ot.departure_time AS "departureTime",
        ot.is_round_trip AS "isRoundTrip",
        ot.return_date AS "returnDate",
        ot.return_time AS "returnTime",
        ot.estimated_price AS "estimatedPrice"
      FROM order_transports ot
      WHERE ot.travel_order_id = $1
      ORDER BY ot.created_at ASC;
    `;
    const transportRes = await this.pool.query(transportQuery, [travelOrderId]);

    // 3. Query Akomodasi Hotel & Detail Tamu Penginap
    const hotelQuery = `
      SELECT 
        oh.id,
        oh.hotel_name_custom AS "hotelNameCustom",
        oh.room_count AS "roomCount",
        oh.check_in_date AS "checkInDate",
        oh.check_out_date AS "checkOutDate",
        oh.duration_nights AS "durationNights",
        oh.price_per_night AS "pricePerNight",
        oh.subtotal_price AS "subtotalPrice",
        mc.name AS "cityName",
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ohg.id,
                'roomNumber', ohg.room_number,
                'bedSlot', ohg.bed_slot,
                'category', ohg.category,
                'guestName', ohg.guest_name,
                'npkOrKtp', ohg.npk_or_ktp,
                'jabatanOrInstansi', ohg.jabatan_or_instansi,
                'phone', ohg.phone,
                'isFilled', ohg.is_filled
              )
            ), '[]'::json
          )
          FROM order_hotel_guests ohg
          WHERE ohg.order_hotel_id = oh.id
        ) AS "guests"
      FROM order_hotels oh
      LEFT JOIN master_cities mc ON oh.city_id = mc.id
      WHERE oh.travel_order_id = $1;
    `;
    const hotelRes = await this.pool.query(hotelQuery, [travelOrderId]);

    // 4. Query Timeline Audit Log Persetujuan
    const logQuery = `
      SELECT 
        al.id,
        al.action,
        al.notes,
        al.created_at AS "createdAt",
        u.nama_lengkap AS "actorNama",
        u.jabatan AS "actorJabatan"
      FROM approval_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE al.travel_order_id = $1
      ORDER BY al.created_at ASC;
    `;
    const logRes = await this.pool.query(logQuery, [travelOrderId]);

    return {
      ...orderHeader,
      transports: transportRes.rows,
      hotels: hotelRes.rows,
      approvalLogs: logRes.rows,
    };
  }
}
