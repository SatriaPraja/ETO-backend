import { Pool, PoolClient } from "pg";
import { UpdateTravelOrderCorrectionInput } from "../schemas/travelEditOrderSchema.ts";

export class TravelEditOrderRepository {
  constructor(private pool: Pool) {}

  private isValidUUID(str?: string | null): boolean {
    if (!str) return false;
    const regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(str);
  }

  // ====================================================================
  // 1. GET FULL DATA KOREKSI (Header, Transports, Hotels & Guests)
  // ====================================================================
  async getCorrectionDetail(identifier: string) {
    const isUUID = this.isValidUUID(identifier);

    const query = `
      SELECT 
        tro.id,
        tro.to_code AS "toCode",
        tro.status,
        tro.created_at AS "createdAt",
        tro.order_date AS "orderDate",
        tro.activity_name AS "activityName",
        tro.unit_kerja_kode AS "unitKerjaKode",
        tro.unit_kerja_nama AS "unitKerjaNama",
        tro.sprin_number AS "sprinNumber",
        tro.sprin_detail AS "sprinDetail",
        tro.notes,
        tro.total_estimated_cost AS "totalEstimatedCost",
        
        -- Approver Info
        tro.approver_id AS "approverId",
        app.nama_lengkap || ' (' || app.jabatan || ')' AS "approverNama",
        
        -- Budget Info (master_budgets)
        tro.budget_id AS "budgetId",
        b.account_number AS "budgetAccountNumber",
        b.account_name AS "budgetAccountName",
        b.program_name AS "programKerja",
        (b.pagu_budget - b.used_budget) AS "remainingBudget",

        -- Detail Transportasi (order_transports)
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ot.id,
            'category', ot.category,
            'userId', ot.user_id,
            'guestName', ot.guest_name,
            'npkOrKtp', ot.npk_or_ktp,
            'jabatan', ot.jabatan,
            'instansi', ot.instansi,
            'phone', ot.phone,
            'departureDate', TO_CHAR(ot.departure_date, 'YYYY-MM-DD'),
            'departureTime', ot.departure_time,
            'returnDate', TO_CHAR(ot.return_date, 'YYYY-MM-DD'),
            'returnTime', ot.return_time,
            'isRoundTrip', ot.is_round_trip,
            'estimatedPrice', ot.estimated_price
          ))
          FROM order_transports ot WHERE ot.travel_order_id = tro.id
        ), '[]'::json) AS "transports",

        -- Detail Hotel (order_hotels) + LEFT JOIN master_cities + Guests Nested
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', oh.id,
            'hotelId', oh.hotel_id,
            'hotelNameCustom', oh.hotel_name_custom,
            'cityId', oh.city_id,
            'cityName', mc.name, -- 🟢 Mengambil nama kota dari master_cities
            'roomCount', oh.room_count,
            'checkInDate', TO_CHAR(oh.check_in_date, 'YYYY-MM-DD'),
            'checkOutDate', TO_CHAR(oh.check_out_date, 'YYYY-MM-DD'),
            'durationNights', oh.duration_nights,
            'pricePerNight', oh.price_per_night,
            'subtotalPrice', oh.subtotal_price,
            'guests', COALESCE((
              SELECT json_agg(json_build_object(
                'id', ohg.id,
                'roomNumber', ohg.room_number,
                'bedSlot', ohg.bed_slot,
                'category', ohg.category,
                'userId', ohg.user_id,
                'guestName', ohg.guest_name,
                'npkOrKtp', ohg.npk_or_ktp,
                'jabatanOrInstansi', ohg.jabatan_or_instansi,
                'phone', ohg.phone,
                'isFilled', ohg.is_filled
              ))
              FROM order_hotel_guests ohg WHERE ohg.order_hotel_id = oh.id
            ), '[]'::json)
          ))
          FROM order_hotels oh
          LEFT JOIN master_cities mc ON oh.city_id = mc.id -- 🟢 JOIN ke master_cities
          WHERE oh.travel_order_id = tro.id
        ), '[]'::json) AS "hotels"

      FROM travel_orders tro
      LEFT JOIN users app ON tro.approver_id = app.id
      LEFT JOIN master_budgets b ON tro.budget_id = b.id
      WHERE ${isUUID ? "tro.id = $1" : "tro.to_code = $1"}
      LIMIT 1;
    `;

    const res = await this.pool.query(query, [identifier]);
    return res.rows[0] || null;
  }

  // ====================================================================
  // 2. SIMPAN/KOREKSI DENGAN SYNC FULL (INSERT, UPDATE, DELETE)
  // ====================================================================
  async updateAndResubmit(
    client: PoolClient,
    input: UpdateTravelOrderCorrectionInput,
    userId: string,
  ) {
    // A. Hitung Ulang Total Cost
    const totalTransport = input.transports.reduce(
      (sum, t) => sum + Number(t.estimatedPrice || 0),
      0,
    );
    const totalHotel = input.hotels.reduce(
      (sum, h) => sum + Number(h.subtotalPrice || 0),
      0,
    );
    const grandTotalCost = totalTransport + totalHotel;

    // B. Update Header travel_orders & Ubah Status Kembali ke WAITING_PEJABAT
    const updateHeaderRes = await client.query(
      `
      UPDATE travel_orders 
      SET 
        sprin_number = $1,
        activity_name = $2,
        budget_id = $3,
        sprin_detail = $4,
        notes = $5,
        total_estimated_cost = $6,
        status = 'WAITING_PEJABAT',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
      `,
      [
        input.sprinNumber,
        input.activityName,
        input.budgetId,
        input.sprinDetail,
        input.notes,
        grandTotalCost,
        input.travelOrderId,
      ],
    );

    if (updateHeaderRes.rowCount === 0) {
      throw new Error("Travel Order tidak ditemukan.");
    }

    // C. Hapus Transport Yang Dibuang User dari Form
    const transportKeepIds = input.transports
      .map((t) => t.id)
      .filter((id): id is string => Boolean(id) && this.isValidUUID(id));

    if (transportKeepIds.length > 0) {
      await client.query(
        `DELETE FROM order_transports WHERE travel_order_id = $1 AND id NOT IN (${transportKeepIds.map((_, i) => `$${i + 2}`).join(",")})`,
        [input.travelOrderId, ...transportKeepIds],
      );
    } else {
      await client.query(
        `DELETE FROM order_transports WHERE travel_order_id = $1`,
        [input.travelOrderId],
      );
    }

    // D. Upsert Transport (Insert / Update order_transports)
    for (const t of input.transports) {
      if (t.id && this.isValidUUID(t.id)) {
        await client.query(
          `
          UPDATE order_transports SET 
            guest_name = $1, npk_or_ktp = $2, jabatan = $3, instansi = $4, phone = $5,
            departure_date = $6, departure_time = $7, return_date = $8, return_time = $9,
            is_round_trip = $10, estimated_price = $11
          WHERE id = $12 AND travel_order_id = $13;
          `,
          [
            t.guestName,
            t.npkOrKtp || null,
            t.jabatan || null,
            t.instansi || null,
            t.phone,
            t.departureDate,
            t.departureTime || "08:00",
            t.returnDate || null,
            t.returnTime || null,
            Boolean(t.isRoundTrip),
            Number(t.estimatedPrice) || 0,
            t.id,
            input.travelOrderId,
          ],
        );
      } else {
        await client.query(
          `
          INSERT INTO order_transports (
            travel_order_id, transport_type, category, user_id, guest_name, npk_or_ktp,
            jabatan, instansi, phone, departure_date, departure_time, return_date, return_time,
            is_round_trip, estimated_price
          ) VALUES ($1, 'flight', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
          `,
          [
            input.travelOrderId,
            t.category || "INTERNAL",
            t.userId || null,
            t.guestName,
            t.npkOrKtp || null,
            t.jabatan || null,
            t.instansi || null,
            t.phone,
            t.departureDate,
            t.departureTime || "08:00",
            t.returnDate || null,
            t.returnTime || null,
            Boolean(t.isRoundTrip),
            Number(t.estimatedPrice) || 0,
          ],
        );
      }
    }

    // E. Sync Hapus Hotel Yang Dibuang dari Form
    const hotelKeepIds = input.hotels
      .map((h) => h.id)
      .filter((id): id is string => Boolean(id) && this.isValidUUID(id));

    if (hotelKeepIds.length > 0) {
      await client.query(
        `DELETE FROM order_hotels WHERE travel_order_id = $1 AND id NOT IN (${hotelKeepIds.map((_, i) => `$${i + 2}`).join(",")})`,
        [input.travelOrderId, ...hotelKeepIds],
      );
    } else {
      await client.query(
        `DELETE FROM order_hotels WHERE travel_order_id = $1`,
        [input.travelOrderId],
      );
    }

    // F. Upsert Hotel (order_hotels) & Guests (order_hotel_guests)
    for (const h of input.hotels) {
      let hotelId = h.id;

      if (hotelId && this.isValidUUID(hotelId)) {
        await client.query(
          `
          UPDATE order_hotels SET 
            hotel_id = $1, hotel_name_custom = $2, city_id = $3, room_count = $4,
            check_in_date = $5, check_out_date = $6, duration_nights = $7,
            price_per_night = $8, subtotal_price = $9
          WHERE id = $10 AND travel_order_id = $11;
          `,
          [
            h.hotelId || null,
            h.hotelNameCustom || null,
            h.cityId || null,
            h.roomCount,
            h.checkInDate,
            h.checkOutDate,
            h.durationNights,
            h.pricePerNight,
            h.subtotalPrice,
            hotelId,
            input.travelOrderId,
          ],
        );
      } else {
        const insHotel = await client.query(
          `
          INSERT INTO order_hotels (
            travel_order_id, hotel_id, hotel_name_custom, city_id, room_count,
            check_in_date, check_out_date, duration_nights, price_per_night, subtotal_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id;
          `,
          [
            input.travelOrderId,
            h.hotelId || null,
            h.hotelNameCustom || null,
            h.cityId || null,
            h.roomCount,
            h.checkInDate,
            h.checkOutDate,
            h.durationNights,
            h.pricePerNight,
            h.subtotalPrice,
          ],
        );
        hotelId = insHotel.rows[0].id;
      }

      // Upsert Tamu Hotel (order_hotel_guests)
      if (h.guests && h.guests.length > 0) {
        for (const g of h.guests) {
          if (g.id && this.isValidUUID(g.id)) {
            await client.query(
              `
              UPDATE order_hotel_guests SET 
                room_number = $1, bed_slot = $2, category = $3, user_id = $4, guest_name = $5,
                npk_or_ktp = $6, jabatan_or_instansi = $7, phone = $8, is_filled = TRUE
              WHERE id = $9 AND order_hotel_id = $10;
              `,
              [
                g.roomNumber,
                g.bedSlot,
                g.category || "INTERNAL",
                g.userId || null,
                g.guestName,
                g.npkOrKtp || null,
                g.jabatanOrInstansi || null,
                g.phone || null,
                g.id,
                hotelId,
              ],
            );
          } else {
            await client.query(
              `
              INSERT INTO order_hotel_guests (
                order_hotel_id, room_number, bed_slot, category, user_id, guest_name,
                npk_or_ktp, jabatan_or_instansi, phone, is_filled
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE);
              `,
              [
                hotelId,
                g.roomNumber,
                g.bedSlot,
                g.category || "INTERNAL",
                g.userId || null,
                g.guestName,
                g.npkOrKtp || null,
                g.jabatanOrInstansi || null,
                g.phone || null,
              ],
            );
          }
        }
      }
    }

    // G. Audit Trail Log (approval_logs)
    await client.query(
      `
      INSERT INTO approval_logs (travel_order_id, actor_id, action, notes, created_at)
      VALUES ($1, $2, 'RESUBMITTED', $3, CURRENT_TIMESTAMP);
      `,
      [input.travelOrderId, userId, `Koreksi dikirimkan ulang: ${input.notes}`],
    );

    return updateHeaderRes.rows[0];
  }
}
