import { Pool, PoolClient } from "pg";
import { GetInboxQueryInput } from "../schemas/approvalSchema";

export class ApprovalRepository {
  constructor(private pool: Pool) {}

  async getTravelOrderById(client: PoolClient, id: string) {
    const query = `
      SELECT id, to_code, booker_id, approver_id, status 
      FROM travel_orders 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const res = await client.query(query, [id]);
    return res.rows[0] || null;
  }

  async updateOrderStatus(client: PoolClient, id: string, status: string) {
    const query = `
      UPDATE travel_orders 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, to_code, status;
    `;
    const res = await client.query(query, [status, id]);
    return res.rows[0];
  }

  async createApprovalLog(
    client: PoolClient,
    data: {
      travelOrderId: string;
      actorId: string;
      action: string;
      notes?: string;
    },
  ) {
    const query = `
      INSERT INTO approval_logs (id, travel_order_id, actor_id, action, notes, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING id, action, created_at;
    `;
    const res = await client.query(query, [
      data.travelOrderId,
      data.actorId,
      data.action,
      data.notes || null,
    ]);
    return res.rows[0];
  }

  async getTransactionClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    return client;
  }

  async getInboxOrders(
    query: GetInboxQueryInput,
    currentUser: { id: string; activeRole: string },
  ) {
    const { tab, search, page, limit } = query;
    const offset = (page - 1) * limit;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // 1. Logika Filter Hak Akses Berdasarkan Role & Status (Pending vs History)
    let roleAndStatusCondition = "";

    if (currentUser.activeRole === "APPROVER_KAKANWIL") {
      // 🟢 Pejabat Penyetuju: Wajib ditujukan ke id-nya (approver_id)
      queryParams.push(currentUser.id);
      const approverIdParam = `$${paramIndex++}`;

      if (tab === "pending") {
        roleAndStatusCondition = `tro.status = 'WAITING_PEJABAT' AND tro.approver_id = ${approverIdParam}`;
      } else {
        // History: yang pernah disetujui/ditolak/dikembalikan olehnya
        roleAndStatusCondition = `tro.status IN ('WAITING_ADMINTRAVEL', 'APPROVED', 'REJECTED', 'RETURNED') AND tro.approver_id = ${approverIdParam}`;
      }
    } else if (currentUser.activeRole === "ADMIN_TRAVEL_KP") {
      // 🟢 Admin Travel KP: Melihat SEMUA yang sudah lolos tahap pejabat (WAITING_ADMINTRAVEL)
      if (tab === "pending") {
        roleAndStatusCondition = `tro.status = 'WAITING_ADMINTRAVEL'`;
      } else {
        // History Admin Travel: yang sudah APPROVED atau REJECTED oleh Admin
        roleAndStatusCondition = `tro.status IN ('APPROVED', 'REJECTED', 'RETURNED')`;
      }
    } else {
      // 🟢 SUPER_ADMIN: Bebas melihat SEMUA data pengajuan
      if (tab === "pending") {
        roleAndStatusCondition = `tro.status IN ('WAITING_PEJABAT', 'WAITING_ADMINTRAVEL')`;
      } else {
        roleAndStatusCondition = `tro.status IN ('APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED')`;
      }
    }

    // 2. Filter Pencarian (Search Parameter)
    let searchCondition = "";
    if (search && search.trim() !== "") {
      searchCondition = ` AND (
        LOWER(tro.to_code) LIKE LOWER($${paramIndex}) OR 
        LOWER(tro.activity_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(u_booker.nama_lengkap) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // 3. Query Count untuk Badge Sub-Tab (Pending vs History)
    let countWhereClause = "";
    const countParams: any[] = [];

    if (currentUser.activeRole === "APPROVER_KAKANWIL") {
      countWhereClause = `WHERE tro.approver_id = $1`;
      countParams.push(currentUser.id);
    } else if (currentUser.activeRole === "ADMIN_TRAVEL_KP") {
      countWhereClause = `WHERE tro.status != 'WAITING_PEJABAT'`;
    }

    const countQuery = `
      SELECT 
        COUNT(CASE 
          WHEN '${currentUser.activeRole}' = 'APPROVER_KAKANWIL' THEN (CASE WHEN tro.status = 'WAITING_PEJABAT' THEN 1 END)
          WHEN '${currentUser.activeRole}' = 'ADMIN_TRAVEL_KP' THEN (CASE WHEN tro.status = 'WAITING_ADMINTRAVEL' THEN 1 END)
          ELSE (CASE WHEN tro.status IN ('WAITING_PEJABAT', 'WAITING_ADMINTRAVEL') THEN 1 END)
        END) AS "pendingCount",
        
        COUNT(CASE 
          WHEN '${currentUser.activeRole}' = 'APPROVER_KAKANWIL' THEN (CASE WHEN tro.status IN ('WAITING_ADMINTRAVEL', 'APPROVED', 'REJECTED', 'RETURNED') THEN 1 END)
          WHEN '${currentUser.activeRole}' = 'ADMIN_TRAVEL_KP' THEN (CASE WHEN tro.status IN ('APPROVED', 'REJECTED', 'RETURNED') THEN 1 END)
          ELSE (CASE WHEN tro.status IN ('APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED') THEN 1 END)
        END) AS "historyCount"
      FROM travel_orders tro
      ${countWhereClause};
    `;

    const countRes = await this.pool.query(countQuery, countParams);
    const pendingCount = parseInt(countRes.rows[0]?.pendingCount || "0", 10);
    const historyCount = parseInt(countRes.rows[0]?.historyCount || "0", 10);

    // 4. Query Main Data List
    const mainQuery = `
      SELECT 
        tro.id,
        tro.to_code AS "toCode",
        tro.activity_name AS "activityName",
        tro.unit_kerja_nama AS "unitKerjaNama",
        tro.status,
        tro.total_estimated_cost AS "totalEstimatedCost",
        tro.created_at AS "createdAt",
        u_booker.nama_lengkap AS "bookerNama",
        
        (
          SELECT COUNT(*) 
          FROM order_transports ot 
          WHERE ot.travel_order_id = tro.id
        ) AS "travelerCount",
        
        (
          SELECT ot.transport_type 
          FROM order_transports ot 
          WHERE ot.travel_order_id = tro.id 
          LIMIT 1
        ) AS "primaryTransportType"

      FROM travel_orders tro
      LEFT JOIN users u_booker ON tro.booker_id = u_booker.id
      WHERE ${roleAndStatusCondition} ${searchCondition}
      ORDER BY tro.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    queryParams.push(limit, offset);
    const listRes = await this.pool.query(mainQuery, queryParams);

    return {
      items: listRes.rows,
      counts: {
        pending: pendingCount,
        history: historyCount,
      },
    };
  }
}
