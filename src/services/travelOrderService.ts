import { Pool } from "pg";
import { TravelOrderRepository } from "../repositories/travelOrderRepository.ts";
import {
  CreateStandaloneTravelOrderDTO,
  AddTransportToExistingTODTO,
  AddHotelToExistingTODTO,
} from "../schemas/travelOrderSchema.ts";

export class TravelOrderService {
  constructor(
    private toRepo: TravelOrderRepository,
    private pool: Pool,
  ) {}

  // 1. PEMBUATAN HEADER TRAVEL ORDER MANDIRI
  async createTravelOrder(
    bookerId: string,
    payload: CreateStandaloneTravelOrderDTO,
  ) {
    const travelOrder = await this.toRepo.createTravelOrderHeader(
      bookerId,
      payload,
    );
    return {
      message:
        "Header Travel Order berhasil dibuat. Silakan pilih Travel Order ini untuk menambah penerbangan/hotel.",
      data: travelOrder,
    };
  }

  // 2. PENGAJUAN MODUL TRANSPORTASI (HANYA UNTUK TO EXISTING)
  async addTransportOrder(payload: AddTransportToExistingTODTO) {
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

    const totalCost = payload.travellers.reduce((sum, item) => {
      const price = item.price || 0;
      return sum + (item.isRoundTrip ? price * 2 : price);
    }, 0);

    // Cek saldo anggaran
    const budgetRes = await this.pool.query(
      `SELECT pagu_budget, used_budget FROM master_budgets WHERE id = $1`,
      [existingTO.budget_id],
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

    await this.toRepo.addTransportsToExistingTO(
      existingTO.id,
      payload.travellers,
      totalCost,
    );

    // Potong anggaran
    await this.pool.query(
      `UPDATE master_budgets SET used_budget = used_budget + $1 WHERE id = $2`,
      [totalCost, existingTO.budget_id],
    );

    return {
      message: `Pemesanan Transportasi berhasil ditambahkan ke Travel Order ${existingTO.to_code}`,
      data: {
        travelOrderId: existingTO.id,
        toCode: existingTO.to_code,
        totalCost,
      },
    };
  }

  // 3. PENGAJUAN MODUL HOTEL (HANYA UNTUK TO EXISTING)
  async addHotelOrder(payload: AddHotelToExistingTODTO) {
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

    const hotelCost = payload.hotels.reduce(
      (sum, item) => sum + (item.subtotalPrice || 0),
      0,
    );

    const savedHotels = await this.toRepo.addHotelToExistingTO(
      existingTO.id,
      payload.hotels,
      hotelCost,
    );

    await this.pool.query(
      `UPDATE master_budgets SET used_budget = used_budget + $1 WHERE id = $2`,
      [hotelCost, existingTO.budget_id],
    );

    return {
      message: `Pemesanan Hotel berhasil ditambahkan ke Travel Order ${existingTO.to_code}`,
      data: {
        travelOrderId: existingTO.id,
        toCode: existingTO.to_code,
        hotels: savedHotels,
      },
    };
  }

  // 4. GET EXISTING ORDERS
  async getExistingOrders(searchQuery?: string, statusFilter?: string) {
    const rawData = await this.toRepo.findExistingOrders(
      searchQuery,
      statusFilter,
    );

    return rawData.map((row) => {
      let statusUI:
        | "Menunggu Persetujuan Pejabat"
        | "Disetujui"
        | "Perlu Koreksi" = "Menunggu Persetujuan Pejabat";
      if (row.status === "APPROVED") statusUI = "Disetujui";
      else if (row.status === "REJECTED" || row.status === "REVISION")
        statusUI = "Perlu Koreksi";

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

      const formattedEstimate = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(row.totalEstimateRaw || 0);

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
            transportsList.push({ type: t.type, label: labelText });
          }
        });
      }

      if (row.hotels_agg && row.hotels_agg.count_hotels > 0) {
        transportsList.push({
          type: "hotel",
          label: `Hotel (${row.hotels_agg.sum_rooms} Kamar)`,
        });
      }

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
  }
}
