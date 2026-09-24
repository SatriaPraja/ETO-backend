import { ApprovalRepository } from "../repositories/approvalRepository";
import { GetInboxQueryInput, UpdateStatusInput } from "../schemas/approvalSchema";

// Define Tipe Data currentUser agar TypeScript tidak melempar error
interface CurrentUserPayload {
  id?: string;
  role?: string;
  activeRole?: string;
  user?: {
    id?: string;
    role?: string;
  };
}

export class ApprovalService {
  constructor(private repo: ApprovalRepository) {}

  async updateStatus(
    input: UpdateStatusInput,
    currentUser: CurrentUserPayload,
  ) {
    const client = await this.repo.getTransactionClient();

    try {
      await client.query("BEGIN");

      // 1. Ambil data order & kunci baris (Lock FOR UPDATE)
      const order = await this.repo.getTravelOrderById(
        client,
        input.travelOrderId,
      );
      if (!order) {
        throw new Error("Travel Order tidak ditemukan");
      }

      const targetStatus = input.status;

      // 🟢 Ambil userRole & userId dengan fallback aman tanpa error TypeScript
      const userRole =
        currentUser.activeRole ||
        currentUser.role ||
        currentUser.user?.role ||
        "";
      const userId = currentUser.id || currentUser.user?.id || "";

      // 2. Validasi Aturan Akses (Gunakan userRole)
      if (targetStatus === "RETURNED") {
        if (userRole !== "APPROVER_KAKANWIL" && userRole !== "SUPER_ADMIN") {
          throw new Error(
            "Hanya Pejabat Penyetuju atau Super Admin yang dapat mengembalikan pengajuan (RETURNED)",
          );
        }
      } else if (targetStatus === "CANCELLED") {
        if (order.booker_id !== userId && userRole !== "SUPER_ADMIN") {
          throw new Error(
            "Hanya Booker pembuat pengajuan atau Super Admin yang dapat membatalkan order ini",
          );
        }
      } else if (targetStatus === "REJECTED") {
        const allowedRoles = [
          "APPROVER_KAKANWIL",
          "ADMIN_TRAVEL_KP",
          "SUPER_ADMIN",
        ];
        if (!allowedRoles.includes(userRole)) {
          throw new Error(
            "Anda tidak memiliki hak akses untuk menolak pengajuan ini",
          );
        }
      } else if (targetStatus === "WAITING_ADMINTRAVEL") {
        if (userRole !== "APPROVER_KAKANWIL" && userRole !== "SUPER_ADMIN") {
          throw new Error(
            "Hanya Pejabat Penyetuju yang dapat menyetujui tahap pertama ke Admin Travel",
          );
        }
      } else if (targetStatus === "APPROVED") {
        if (userRole !== "ADMIN_TRAVEL_KP" && userRole !== "SUPER_ADMIN") {
          throw new Error(
            "Hanya Admin Travel Pusat atau Super Admin yang dapat menerbitkan persetujuan akhir (APPROVED)",
          );
        }
      }

      // 3. Update Status Order
      const updatedOrder = await this.repo.updateOrderStatus(
        client,
        input.travelOrderId,
        targetStatus,
      );
      // 4. Petakan targetStatus ke nilai ENUM yang valid di approval_action_enum
      let actionEnum: string = targetStatus;
      let defaultNote = `Status diubah menjadi ${targetStatus}`;

      if (targetStatus === "WAITING_PEJABAT") {
        actionEnum = "RESUBMITTED"; //
        defaultNote = "Pengajuan draf dikirimkan ulang (Resubmitted)";
      } else if (targetStatus === "WAITING_ADMINTRAVEL") {
        actionEnum = "APPROVED"; //
        defaultNote = "Disetujui Pejabat (Menunggu Verifikasi Admin Travel)";
      } else if (targetStatus === "APPROVED") {
        actionEnum = "APPROVED";
        defaultNote = "Disetujui Penuh & Issued oleh Admin Travel";
      } else if (targetStatus === "RETURNED") {
        actionEnum = "RETURNED";
        defaultNote = "Dikembalikan untuk Koreksi Draf";
      } else if (targetStatus === "REJECTED") {
        actionEnum = "REJECTED";
        defaultNote = "Pengajuan Ditolak";
      } else if (targetStatus === "CANCELLED") {
        actionEnum = "CANCELLED";
        defaultNote = "Pengajuan Dibatalkan oleh Booker";
      }

      // Gabungkan catatan input user dengan catatan sistem jika ada
      const finalNote = input.notes
        ? `${defaultNote} - Catatan: ${input.notes}`
        : defaultNote;

      // 5. Simpan ke approval_logs menggunakan actionEnum yang valid
      await this.repo.createApprovalLog(client, {
        travelOrderId: input.travelOrderId,
        actorId: userId,
        action: actionEnum,
        notes: finalNote,
      });

      await client.query("COMMIT");
      return updatedOrder;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getInbox(query: GetInboxQueryInput, currentUser: any) {
    const userPayload = {
      id: currentUser.id || currentUser.user?.id || "",
      activeRole:
        currentUser.activeRole ||
        currentUser.role ||
        currentUser.user?.role ||
        "",
    };

    const rawData = await this.repo.getInboxOrders(query, userPayload);

    // Helper Format Waktu Relative
    const formatTimeAgo = (dateStr: string) => {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 60) return `${Math.max(diffMins, 1)} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      return "Kemarin";
    };

    // Helper Format Rupiah
    const formatRupiah = (val: number | string) => {
      const num = Number(val) || 0;
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(num);
    };

    // Helper Pemetaan Ikon & Warna berdasarkan Transport Type
    const getTransportMeta = (type?: string) => {
      switch (type) {
        case "flight":
          return { icon: "flight", color: "bg-sky-500" };
        case "train":
          return { icon: "train", color: "bg-orange-500" };
        case "car":
          return { icon: "directions_car", color: "bg-emerald-600" };
        case "bus":
          return { icon: "directions_bus", color: "bg-red-800" };
        default:
          return { icon: "directions_boat", color: "bg-purple-600" };
      }
    };

    // Pemetaan ke Interface Vue Frontend
    const mappedItems = rawData.items.map((row: any) => {
      const meta = getTransportMeta(row.primaryTransportType);
      return {
        id: row.toCode,
        rawId: row.id,
        title: row.activityName,
        submitter: row.bookerNama || "Official Booker",
        unit: row.unitKerjaNama || "BPJS Ketenagakerjaan",
        timeAgo: formatTimeAgo(row.createdAt),
        typeIcon: meta.icon,
        typeColor: meta.color,
        travelerCount: `${row.travelerCount || 0} Karyawan`,
        amount: formatRupiah(row.totalEstimatedCost),
        statusText:
          row.status === "WAITING_PEJABAT" ||
          row.status === "WAITING_ADMINTRAVEL"
            ? "Sedang Ditinjau ➔"
            : "›",
        status: row.status,
      };
    });

    return {
      items: mappedItems,
      counts: rawData.counts,
    };
  }
}
