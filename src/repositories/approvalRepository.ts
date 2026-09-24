import { Pool, PoolClient } from 'pg';

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

  async createApprovalLog(client: PoolClient, data: { travelOrderId: string; actorId: string; action: string; notes?: string }) {
    const query = `
      INSERT INTO approval_logs (id, travel_order_id, actor_id, action, notes, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING id, action, created_at;
    `;
    const res = await client.query(query, [
      data.travelOrderId,
      data.actorId,
      data.action,
      data.notes || null
    ]);
    return res.rows[0];
  }

  async getTransactionClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    return client;
  }
}