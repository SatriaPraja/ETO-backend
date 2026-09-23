import { Pool } from "pg";
import { TravelOrderRepository } from "../repositories/travelOrderRepository.ts";
import {
  CreateTravelOrderDTO,
  CreateHotelOrderDTO,
} from "../schemas/travelOrderSchema.ts";

export class TravelOrderService {
  constructor(
    private toRepo: TravelOrderRepository,
    private pool: Pool,
  ) {}

  // A. Tahap 1: Pengajuan Order Transportasi (Pesawat)
  async createFlightOrder(bookerId: string, payload: CreateTravelOrderDTO) {
    // 1. Hitung total estimasi biaya tiket penerbangan
    const totalCost = payload.travellers.reduce((sum, item) => {
      const price = item.price || 0;
      return sum + (item.isRoundTrip ? price * 2 : price);
    }, 0);

    // 2. Cek kecukupan saldo anggaran
    const budgetRes = await this.pool.query(
      `SELECT pagu_budget, used_budget FROM master_budgets WHERE id = $1`,
      [payload.budgetId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    );

    if (budgetRes.rows.length > 0) {
      const { pagu_budget, used_budget } = budgetRes.rows[0];
      const remaining = parseFloat(pagu_budget) - parseFloat(used_budget);

      if (totalCost > remaining) {
        throw new Error(
          `Saldo anggaran tidak mencukupi. Sisa saldo: Rp ${remaining.toLocaleString("id-ID")}`,
        );
      }
    }

    // 🟢 3. CEK ATAU BUAT TRAVEL ORDER (Existing vs Stand-alone)
    // Periksa apakah toCode / existingToOption sudah terdaftar di DB
    const targetCode = payload.existingToOption || payload.toCode;

    const existingRes = await this.pool.query(
      `SELECT id, to_code FROM travel_orders WHERE to_code = $1`,
      [targetCode],
    );

    let travelOrderResult;

    if (existingRes.rows.length > 0) {
      // 🟢 JIKA TO SUDAH ADA: Hanya tambahkan item penerbangan ke order_transports
      const existingTO = existingRes.rows[0];

      // Tambahkan item traveler/transport baru ke TO yang ada
      await this.toRepo.addTransportsToExistingTO(
        existingTO.id,
        payload.travellers,
      );

      // Update total biaya dan potong anggaran
      await this.pool.query(
        `UPDATE travel_orders SET total_estimated_cost = total_estimated_cost + $1 WHERE id = $2`,
        [totalCost, existingTO.id],
      );

      await this.pool.query(
        `UPDATE master_budgets SET used_budget = used_budget + $1 WHERE id = $2`,
        [totalCost, payload.budgetId],
      );

      travelOrderResult = { id: existingTO.id, toCode: existingTO.to_code };
    } else {
      // 🟢 JIKA TO BARU (Stand-alone): Lakukan insert header travel_orders & detail order_transports
      travelOrderResult = await this.toRepo.createFlightOrder(
        bookerId,
        payload,
        totalCost,
      );
    }

    return {
      message:
        existingRes.rows.length > 0
          ? "Penerbangan berhasil ditambahkan ke Travel Order Existing."
          : "Travel Order Pesawat berhasil diajukan.",
      data: travelOrderResult,
    };
  }

  // B. Tahap 2: Pengajuan Order Hotel (Gabung ke TO Existing)
  async createHotelOrder(payload: CreateHotelOrderDTO) {
    // 1. Cek keberadaan Travel Order Existing
    const toRes = await this.pool.query(
      `SELECT id, to_code, budget_id FROM travel_orders WHERE to_code = $1 OR id::text = $1`,
      [payload.travelOrderId],
    );

    if (toRes.rows.length === 0) {
      throw new Error(
        `Travel Order '${payload.travelOrderId}' tidak ditemukan.`,
      );
    }

    const existingTO = toRes.rows[0];

    // 2. Hitung Total Biaya Hotel
    const hotelCost = payload.hotels.reduce(
      (sum, item) => sum + (item.subtotalPrice || 0),
      0,
    );

    // 3. Simpan Detail Hotel ke order_hotels & potong anggaran
    const savedHotels = await this.toRepo.addHotelToExistingTO(
      existingTO.id,
      existingTO.budget_id,
      payload.hotels,
      hotelCost,
    );

    return {
      message:
        "Pemesanan Hotel berhasil ditambahkan ke Travel Order " +
        existingTO.to_code,
      data: {
        travelOrderId: existingTO.id,
        toCode: existingTO.to_code,
        hotels: savedHotels,
      },
    };
  }

  async getExistingOrders(searchQuery?: string, statusFilter?: string) {
    const rawData = await this.toRepo.findExistingOrders(
      searchQuery,
      statusFilter,
    );

    // Mapping ke format ExistingTOItem lengkap untuk Vue Frontend
    const formattedData = rawData.map((row) => {
      // A. Formatter Status DB ke UI
      let statusUI:
        | "Menunggu Persetujuan Pejabat"
        | "Disetujui"
        | "Perlu Koreksi" = "Menunggu Persetujuan Pejabat";
      if (row.status === "APPROVED") statusUI = "Disetujui";
      else if (row.status === "REJECTED" || row.status === "REVISION")
        statusUI = "Perlu Koreksi";

      // B. Formatter Tanggal
      const dateObj = new Date(row.createdAt);
      const dateStr = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timeStr = dateObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedDate = `${dateStr}, ${timeStr} WIB`;

      // C. Formatter Rupiah Total Estimasi
      const formattedEstimate = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(row.totalEstimateRaw || 0);

      // D. Formatter Array Transport & Hotel Badges
      const transportsList: {
        type: "flight" | "train" | "hotel" | "bus" | "car";
        label: string;
      }[] = [];

      if (Array.isArray(row.transports_agg)) {
        row.transports_agg.forEach((t: any) => {
          let labelText = "";
          if (t.type === "flight")
            labelText = `Pesawat Udara (${t.count} Orang)`;
          else if (t.type === "train")
            labelText = `Kereta Api (${t.count} Orang)`;
          else if (t.type === "bus")
            labelText = `Bus / Travel (${t.count} Orang)`;
          else if (t.type === "car")
            labelText = `Mobil Dinas (${t.count} Kendaraan)`;

          if (labelText) {
            transportsList.push({
              type: t.type,
              label: labelText,
            });
          }
        });
      }

      if (row.hotels_agg && row.hotels_agg.count_hotels > 0) {
        transportsList.push({
          type: "hotel",
          label: `Hotel (${row.hotels_agg.sum_rooms} Kamar)`,
        });
      }

      // 🟢 E. RETURN DATA LENGKAP BERSAMA SELURUH FIELD FORM
      return {
        id: row.id,
        toCode: row.toCode,
        status: statusUI,
        date: formattedDate,
        orderDate: row.orderDate || "",
        title: row.title,
        unitKerjaKode: row.unitKerjaKode || "",
        unitKerja: row.unitKerja,
        bookerName: row.bookerName || "Official Booker",
        bookerNpp: row.bookerNpp || "-",
        totalEstimate: formattedEstimate,
        transports: transportsList,

        // 🟢 Field Pendukung Form yang sebelumnya hilang:
        approverId: row.approverId || "",
        approverNama: row.approverNama || "",
        budgetId: row.budgetId || "",
        budgetAccount: row.budgetAccount || "",
        programKerja: row.programKerja || "",
        sprinNumber: row.sprinNumber || "",
        sprinDetail: row.sprinDetail || "",
        notes: row.notes || "",
        remainingBudget: Number(row.remainingBudget) || 0,
      };
    });

    return formattedData;
  }
}
