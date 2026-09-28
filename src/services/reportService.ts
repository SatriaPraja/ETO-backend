import { ReportRepository } from "../repositories/reportRepository.ts";
import { ReportHotelQueryParams, ReportTransportQueryParams } from "../schemas/reportSchema.ts";

export class ReportService {
  constructor(private reportRepo: ReportRepository) {}

  async getHotelReport(params: ReportHotelQueryParams) {
    const stats = await this.reportRepo.getHotelReportStats(params);
    const list = await this.reportRepo.getHotelReportList(params);

    return {
      stats: {
        totalReservasi: stats.totalReservasi || 0,
        totalKamar: stats.totalKamar || 0,
        totalRoomNights: stats.totalRoomNights || 0,
        totalBebanHotel: stats.totalBebanHotel || 0,
        rataRataTarifMalam: stats.rataRataTarifMalam || 0,
        rataRataMalam: stats.rataRataMalam || 0,
        rasioKamarPerReservasi: stats.rasioKamarPerReservasi || 0,
      },
      pagination: {
        totalData: list.totalData,
        page: list.page,
        limit: list.limit,
        totalPages: list.totalPages,
      },
      transactions: list.data,
    };
  }

  async getTransportReport(params: ReportTransportQueryParams) {
    const stats = await this.reportRepo.getTransportReportStats(params);
    const list = await this.reportRepo.getTransportReportList(params);
    const analytics = await this.reportRepo.getTransportAnalytics();

    return {
      stats: {
        totalPengajuan: stats.totalPengajuan || 0,
        disetujuiResmi: stats.disetujuiResmi || 0,
        menunggu: stats.menunggu || 0,
        ditolak: stats.ditolak || 0,
        totalPersonel: stats.totalPersonel || 0,
        internalBPJS: stats.internalBPJS || 0,
        eksternalTamu: stats.eksternalTamu || 0,
        realisasiAnggaran: stats.realisasiAnggaran || 0,
      },
      analytics: {
        compositions: analytics.compositions,
        topCorridors: analytics.topCorridors,
      },
      pagination: {
        totalData: list.totalData,
        page: list.page,
        limit: list.limit,
        totalPages: list.totalPages,
      },
      transactions: list.data,
    };
  }
}