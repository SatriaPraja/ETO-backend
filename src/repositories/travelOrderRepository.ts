import { Pool } from "pg";
import {
  CreateTravelOrderDTO,
  CreateHotelOrderDTO,
} from "../schemas/travelOrderSchema.ts";

export class TravelOrderRepository {
  constructor(private pool: Pool) {}

  // Helper untuk cek apakah string berbentuk UUID yang valid
  private isValidUUID(str?: string | null): boolean {
    if (!str) return false;
    const regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(str);
  }

  // A. SIMPAN TAHAP 1: FLIGHT ORDER (MULTIPLE TRAVELLERS)
  async createFlightOrder(
    bookerId: string,
    data: CreateTravelOrderDTO,
    totalCost: number,
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Resolve Approver & Budget ID
      const approverId = this.isValidUUID(data.approverId)
        ? data.approverId
        : "1db92cc3-4b16-4e39-87e2-43663cf100fd";

      const budgetId = this.isValidUUID(data.budgetId)
        ? data.budgetId
        : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      function generateToCode(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const randomSeq = Math.floor(10000 + Math.random() * 90000); // 5 digit angka acak/urut

        return `TO/${year}/${month}/${randomSeq}`;
      }
      // 2. Insert Header travel_orders
      const insertTO = await client.query(
        `INSERT INTO travel_orders (
          to_code, booker_id, approver_id, budget_id,
          activity_name, unit_kerja_kode, unit_kerja_nama,
          sprin_number, sprin_detail, notes, status, total_estimated_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'WAITING_PEJABAT', $11)
        RETURNING id, to_code, status, total_estimated_cost, created_at`,
        [
          data.toCode || generateToCode(),
          bookerId,
          approverId,
          budgetId,
          data.activityName,
          data.unitKerjaKode || "KANWIL-JATIM",
          data.unitKerjaNama || "Deputi Direktur Wilayah Jawa Timur",
          data.sprinNumber,
          data.sprinDetail,
          data.notes || null,
          totalCost,
        ],
      );

      const travelOrder = insertTO.rows[0];

      // 3. Loop & Insert MULTIPLE TRAVELLERS ke order_transports
      for (const t of data.travellers) {
        // Ambil info rute & maskapai otomatis jika tidak dikirim dari FE
        const maskapaiName =
          t.maskapai ||
          (t.transportId === 2 ? "Batik Air" : "Garuda Indonesia");
        const routeInfoStr = t.route || "JKT ⇄ SUB";
        const depInfoStr =
          t.departureInfo ||
          `${t.departureDate} · ${t.departureTime} WIB (Pergi)`;
        const retInfoStr = t.isRoundTrip
          ? t.returnInfo ||
            `${t.returnDate || t.departureDate} · ${t.returnTime || "17:45"} WIB (Pulang)`
          : null;

        const validUserId = this.isValidUUID(t.userId) ? t.userId : null;

        await client.query(
          `INSERT INTO order_transports (
            travel_order_id, transport_type, category, user_id,
            guest_name, npk_or_ktp, jabatan, instansi, phone,
            origin_city_id, destination_city_id, departure_date, departure_time,
            transport_id, transport_class_id, is_round_trip, return_date, return_time,
            return_transport_id, return_transport_class_id, estimated_price,
            route_info, departure_info, return_info, maskapai, jabatan_or_instansi
          ) VALUES (
            $1, 'flight', $2, $3,
            $4, $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23, $24, $25
          )`,
          [
            travelOrder.id,
            t.category || "INTERNAL",
            validUserId,
            t.name,
            t.npkOrKtp || null,
            t.category === "INTERNAL" ? t.jabatanOrInstansi : null,
            t.category === "EKSTERNAL"
              ? t.jabatanOrInstansi || "Tamu"
              : "BPJS Ketenagakerjaan",
            t.phone,
            t.originCityId || 1,
            t.destinationCityId || 2,
            t.departureDate,
            (t.departureTime || "08:30").substring(0, 5),
            t.transportId || 1,
            t.transportClassId || 1, // transport_class_id
            t.isRoundTrip ?? true,
            t.returnDate || null,
            t.returnTime ? t.returnTime.substring(0, 5) : null,
            t.returnTransportId || t.transportId || 1, // return_transport_id
            t.returnTransportClassId || 1, // return_transport_class_id
            t.price || 0,
            routeInfoStr,
            depInfoStr,
            retInfoStr,
            maskapaiName,
            t.jabatanOrInstansi || null, // jabatan_or_instansi
          ],
        );
      }

      await client.query("COMMIT");
      return travelOrder;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // B. SIMPAN TAHAP 2: HOTEL ORDER (HOTELS + ORDER_HOTEL_GUESTS)
  async addHotelToExistingTO(
    travelOrderIdentifier: string,
    budgetId: string | null,
    hotels: any[],
    totalHotelCost: number,
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // 🟢 1. Cari Real UUID Travel Order berdasarkan ID atau Kode TO (to_code)
      let realToId = travelOrderIdentifier;
      if (!this.isValidUUID(travelOrderIdentifier)) {
        const findTo = await client.query(
          `SELECT id FROM travel_orders WHERE to_code = $1 LIMIT 1`,
          [travelOrderIdentifier],
        );
        if (findTo.rows.length === 0) {
          throw new Error(
            `Travel Order dengan Kode/ID '${travelOrderIdentifier}' tidak ditemukan di database.`,
          );
        }
        realToId = findTo.rows[0].id;
      }

      const savedHotels = [];

      for (const h of hotels) {
        // 2. Insert ke order_hotels
        const hotelRes = await client.query(
          `INSERT INTO order_hotels (
            travel_order_id, hotel_id, hotel_name_custom, city_id,
            room_count, check_in_date, check_out_date, duration_nights,
            price_per_night, subtotal_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, hotel_name_custom, subtotal_price`,
          [
            realToId,
            h.hotelId || 1,
            h.hotelNameCustom ||
              h.hotelName ||
              "Hotel Santika Premiere Gubeng Surabaya",
            h.cityId || 2,
            h.roomCount || 1,
            h.checkInDate,
            h.checkOutDate,
            h.durationNights || 1,
            h.pricePerNight || 0,
            h.subtotalPrice || 0,
          ],
        );

        const orderHotelId = hotelRes.rows[0].id;

        // 🟢 3. Loop & Insert MULTIPLE GUESTS ke order_hotel_guests
        if (h.guests && h.guests.length > 0) {
          for (const g of h.guests) {
            const validUserId = this.isValidUUID(g.userId) ? g.userId : null;

            await client.query(
              `INSERT INTO order_hotel_guests (
                order_hotel_id, room_number, bed_slot, category, user_id,
                guest_name, npk_or_ktp, jabatan_or_instansi, phone, is_filled
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
              [
                orderHotelId,
                g.roomNumber || "Kamar 01",
                g.bedSlot || "Bed A",
                g.category || "INTERNAL",
                validUserId,
                g.guestName,
                g.npkOrKtp || null,
                g.jabatanOrInstansi || null,
                g.phone || null,
              ],
            );
          }
        }

        savedHotels.push(hotelRes.rows[0]);
      }

      // 4. Update Total Cost di Header travel_orders
      await client.query(
        `UPDATE travel_orders SET total_estimated_cost = total_estimated_cost + $1 WHERE id = $2`,
        [totalHotelCost, realToId],
      );

      await client.query("COMMIT");
      return savedHotels;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // GET: Ambil daftar Travel Order Existing untuk pencarian modal frontend
  async findExistingOrders(searchQuery?: string, statusFilter?: string) {
    let whereClause = `WHERE 1=1`;
    const queryParams: any[] = [];

    // 1. Filter Kata Kunci (Nomor TO, Nama Kegiatan, atau Nama Booker)
    if (searchQuery && searchQuery.trim() !== "") {
      queryParams.push(`%${searchQuery.trim().toLowerCase()}%`);
      whereClause += ` AND (
      LOWER(tro.to_code) LIKE $${queryParams.length} OR 
      LOWER(tro.activity_name) LIKE $${queryParams.length} OR 
      LOWER(u.nama_lengkap) LIKE $${queryParams.length}
    )`;
    }

    // 2. Filter Status
    if (statusFilter && statusFilter !== "ALL") {
      let dbStatus = "";
      if (statusFilter === "WAITING") dbStatus = "WAITING_PEJABAT";
      else if (statusFilter === "APPROVED") dbStatus = "APPROVED";
      else if (statusFilter === "CORRECTION") dbStatus = "REJECTED";

      if (dbStatus) {
        queryParams.push(dbStatus);
        whereClause += ` AND tro.status = $${queryParams.length}`;
      }
    }

    // 🟢 PERBAIKAN: Menambahkan relasi JOIN ke users (approver) dan master_budgets
    const query = `
    SELECT 
      tro.id,
      tro.to_code AS "toCode",
      tro.status,
      tro.created_at AS "createdAt",
      tro.order_date AS "orderDate",
      tro.activity_name AS "title",
      tro.unit_kerja_kode AS "unitKerjaKode",
      tro.unit_kerja_nama AS "unitKerja",
      tro.sprin_number AS "sprinNumber",
      tro.sprin_detail AS "sprinDetail",
      tro.notes,
      tro.total_estimated_cost AS "totalEstimateRaw",
      
      -- Booker Info
      u.nama_lengkap AS "bookerName",
      u.npk AS "bookerNpp",

      -- Pejabat Penyetuju Info (Relasi ke users)
      tro.approver_id AS "approverId",
      app.nama_lengkap AS "approverNama",

      -- Mata Anggaran Info (Relasi ke master_budgets)
      tro.budget_id AS "budgetId",
      b.account_number || ' - ' || b.account_name AS "budgetAccount",
      b.program_name AS "programKerja",
      (b.pagu_budget - b.used_budget) AS "remainingBudget",
      
      -- Aggregate Informasi Transportasi
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'type', sub_tr.transport_type,
              'count', sub_tr.total_count
            )
          )
          FROM (
            SELECT ot.transport_type, COUNT(ot.id) AS total_count
            FROM order_transports ot
            WHERE ot.travel_order_id = tro.id
            GROUP BY ot.transport_type
          ) sub_tr
        ), '[]'::json
      ) AS transports_agg,

      -- Aggregate Informasi Hotel
      COALESCE(
        (
          SELECT json_build_object(
            'count_hotels', COUNT(oh.id),
            'sum_rooms', COALESCE(SUM(oh.room_count), 0)
          )
          FROM order_hotels oh
          WHERE oh.travel_order_id = tro.id
        ), '{}'::json
      ) AS hotels_agg

    FROM travel_orders tro
    LEFT JOIN users u ON tro.booker_id = u.id
    LEFT JOIN users app ON tro.approver_id = app.id
    LEFT JOIN master_budgets b ON tro.budget_id = b.id
    ${whereClause}
    ORDER BY tro.created_at DESC
    LIMIT 20
  `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async addTransportsToExistingTO(travelOrderId: string, travellers: any[]) {
    for (const t of travellers) {
      const validUserId = this.isValidUUID(t.userId) ? t.userId : null;
      const maskapaiName =
        t.maskapai || (t.transportId === 2 ? "Batik Air" : "Garuda Indonesia");
      const routeInfoStr = t.route || "JKT ⇄ SUB";
      const depInfoStr =
        t.departureInfo ||
        `${t.departureDate} · ${t.departureTime || "08:30"} WIB (Pergi)`;
      const retInfoStr = t.isRoundTrip
        ? t.returnInfo ||
          `${t.returnDate || t.departureDate} · ${t.returnTime || "17:45"} WIB (Pulang)`
        : null;

      // Bersihkan format jam agar aman untuk PostgreSQL TIME
      const depTimeStr = (t.departureTime || "08:30")
        .replace(/\s*(WIB|WITA|WIT)/gi, "")
        .trim()
        .substring(0, 5);
      const retTimeStr = t.returnTime
        ? t.returnTime
            .replace(/\s*(WIB|WITA|WIT)/gi, "")
            .trim()
            .substring(0, 5)
        : null;

      await this.pool.query(
        `INSERT INTO order_transports (
        travel_order_id, transport_type, category, user_id,
        guest_name, npk_or_ktp, jabatan, instansi, phone,
        origin_city_id, destination_city_id, departure_date, departure_time,
        transport_id, transport_class_id, is_round_trip, return_date, return_time,
        return_transport_id, return_transport_class_id, estimated_price,
        route_info, departure_info, return_info, maskapai, jabatan_or_instansi
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25, $26
      )`,
        [
          travelOrderId,
          t.transportType || "flight", // 🟢 $2: Nilai transport_type wajib diisi!
          t.category || "INTERNAL", // 🟢 $3: Category
          validUserId, // 🟢 $4: User ID
          t.name, // 🟢 $5: Nama Guest / Traveller
          t.npkOrKtp || null,
          t.category === "INTERNAL" ? t.jabatanOrInstansi : null,
          t.category === "EKSTERNAL"
            ? t.jabatanOrInstansi || "Tamu"
            : "BPJS Ketenagakerjaan",
          t.phone,
          t.originCityId || 1,
          t.destinationCityId || 2,
          t.departureDate,
          depTimeStr,
          t.transportId || 1,
          t.transportClassId || 1,
          t.isRoundTrip ?? true,
          t.returnDate || null,
          retTimeStr,
          t.returnTransportId || t.transportId || 1,
          t.returnTransportClassId || 1,
          t.price || 0,
          routeInfoStr,
          depInfoStr,
          retInfoStr,
          maskapaiName,
          t.jabatanOrInstansi || null,
        ],
      );
    }
  }
}
