import { Pool } from "pg";
import {
  VendorQueryParams,
  CreateVendorDTO,
  UpdateVendorDTO,
} from "../schemas/vendorSchema";

export class VendorRepository {
  constructor(private pool: Pool) {}

  // 1. KPI Stats & Distribusi Moda Rekanan
  async getVendorStats() {
    const kpiQuery = `
      SELECT 
        COUNT(*)::INT AS "totalVendor",
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::INT AS "activeVendor",
        COUNT(CASE WHEN is_active = FALSE THEN 1 END)::INT AS "inactiveVendor",
        COUNT(CASE WHEN integration_type ILIKE '%API%' AND is_active = TRUE THEN 1 END)::INT AS "apiLive",
        COUNT(CASE WHEN integration_type ILIKE '%Manual%' OR integration_type ILIKE '%Nonaktif%' OR is_active = FALSE THEN 1 END)::INT AS "perluPembaharuan"
      FROM master_transports;
    `;

    const distributionQuery = `
      SELECT 
        type AS "transportType",
        COUNT(*)::INT AS "count",
        ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM master_transports), 0)) * 100, 0)::INT AS "percentage"
      FROM master_transports
      GROUP BY type
      ORDER BY "count" DESC;
    `;

    const kpiRes = await this.pool.query(kpiQuery);
    const distRes = await this.pool.query(distributionQuery);

    const topModa = distRes.rows[0] || { transportType: "flight", count: 0 };

    return {
      kpi: {
        totalVendor: kpiRes.rows[0]?.totalVendor || 0,
        activeVendor: kpiRes.rows[0]?.activeVendor || 0,
        inactiveVendor: kpiRes.rows[0]?.inactiveVendor || 0,
        apiLive: kpiRes.rows[0]?.apiLive || 0,
        perluPembaharuan: kpiRes.rows[0]?.perluPembaharuan || 0,
        topModa: {
          type: topModa.transportType,
          count: topModa.count,
        },
      },
      distribution: distRes.rows,
    };
  }

  // 2. Get List Vendor (Paging & Filtering)
  async getVendors(params: VendorQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(mt.code ILIKE $${paramIndex} OR mt.name ILIKE $${paramIndex} OR mt.vendor_full_name ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.type) {
      conditions.push(`mt.type = $${paramIndex++}`);
      queryParams.push(params.type);
    }

    if (params.status && params.status !== "all") {
      conditions.push(`mt.is_active = $${paramIndex++}`);
      queryParams.push(params.status === "active");
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    // Count Query
    const countQuery = `SELECT COUNT(*)::INT AS total FROM master_transports mt WHERE ${whereClause};`;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    // Data Query (Termasuk Limit & Offset)
    const dataQuery = `
      SELECT 
        mt.id,
        mt.code,
        mt.name,
        mt.vendor_full_name AS "vendorFullName",
        mt.type,
        mt.partnership_category AS "partnershipCategory",
        mt.integration_type AS "integrationType",
        mt.is_active AS "isActive",
        mt.notes,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', mtc.id,
                'className', mtc.class_name,
                'description', mtc.description,
                'sbuLevelInfo', mtc.sbu_level_info,
                'priceLimitType', mtc.price_limit_type,
                'isActive', mtc.is_active
              )
            )
            FROM master_transport_classes mtc
            WHERE mtc.transport_id = mt.id AND mtc.is_active = TRUE
          ), '[]'
        ) AS "classes"
      FROM master_transports mt
      WHERE ${whereClause}
      ORDER BY mt.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [
      ...queryParams,
      params.limit,
      offset,
    ]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit) || 1,
      data: dataRes.rows,
    };
  }

  // 3. Get Vendor By ID (Lengkap dengan Kelas & User Mappings)
  async getVendorById(id: number) {
    const query = `
      SELECT 
        mt.id,
        mt.code,
        mt.name,
        mt.vendor_full_name AS "vendorFullName",
        mt.type,
        mt.partnership_category AS "partnershipCategory",
        mt.integration_type AS "integrationType",
        mt.is_active AS "isActive",
        mt.notes,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', mtc.id,
                'className', mtc.class_name,
                'description', mtc.description,
                'sbuLevelInfo', mtc.sbu_level_info,
                'priceLimitType', mtc.price_limit_type,
                'isActive', mtc.is_active
              )
            )
            FROM master_transport_classes mtc
            WHERE mtc.transport_id = mt.id
          ), '[]'
        ) AS "classes",
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', utm.id,
                'userId', utm.user_id,
                'userName', u.nama_lengkap,
                'npk', u.npk,
                'systemRole', utm.system_role,
                'unitKerjaNama', utm.unit_kerja_nama,
                'canIssueEticket', utm.can_issue_eticket,
                'canValidateSbu', utm.can_validate_sbu,
                'canAccessBilling', utm.can_access_billing
              )
            )
            FROM user_transport_mappings utm
            JOIN users u ON utm.user_id = u.id
            WHERE utm.transport_id = mt.id
          ), '[]'
        ) AS "assignedUsers"
      FROM master_transports mt
      WHERE mt.id = $1;
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  // 4. Create Vendor + Classes + User Mappings (Transaction)
  async createVendor(dto: CreateVendorDTO) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert Header
      const insertVendorQuery = `
        INSERT INTO master_transports (
          code, name, vendor_full_name, type, partnership_category, integration_type, is_active, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;

      const vendorRes = await client.query(insertVendorQuery, [
        dto.code,
        dto.name || dto.vendorFullName,
        dto.vendorFullName,
        dto.type,
        dto.partnershipCategory || "BUMN / Mitra Korporasi Resmi (Contract)",
        dto.integrationType || "API B2B Aktif",
        dto.isActive ?? true,
        dto.notes || null,
      ]);

      const vendorId = vendorRes.rows[0].id;

      // Insert Detail Classes & SBU
      if (dto.classes && dto.classes.length > 0) {
        for (const cls of dto.classes) {
          await client.query(
            `INSERT INTO master_transport_classes (
              transport_id, class_name, description, sbu_level_info, price_limit_type, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              vendorId,
              cls.className,
              cls.description || null,
              cls.sbuLevelInfo || "Semua Pegawai & Staf Operasional",
              cls.priceLimitType || "Plafon Standar SBU",
              cls.isActive ?? true,
            ],
          );
        }
      }

      // Insert User Access Mappings
      if (dto.assignedUsers && dto.assignedUsers.length > 0) {
        for (const usr of dto.assignedUsers) {
          await client.query(
            `INSERT INTO user_transport_mappings (
              user_id, transport_id, system_role, unit_kerja_nama, can_issue_eticket, can_validate_sbu, can_access_billing
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              usr.userId,
              vendorId,
              usr.systemRole,
              usr.unitKerjaNama,
              usr.canIssueEticket ?? true,
              usr.canValidateSbu ?? true,
              usr.canAccessBilling ?? true,
            ],
          );
        }
      }

      await client.query("COMMIT");
      return this.getVendorById(vendorId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // 5. Update Vendor
  async updateVendor(id: number, dto: UpdateVendorDTO) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const updateVendorQuery = `
        UPDATE master_transports
        SET 
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          vendor_full_name = COALESCE($3, vendor_full_name),
          type = COALESCE($4, type),
          partnership_category = COALESCE($5, partnership_category),
          integration_type = COALESCE($6, integration_type),
          is_active = COALESCE($7, is_active),
          notes = COALESCE($8, notes)
        WHERE id = $9;
      `;

      await client.query(updateVendorQuery, [
        dto.code,
        dto.name || dto.vendorFullName,
        dto.vendorFullName,
        dto.type,
        dto.partnershipCategory,
        dto.integrationType,
        dto.isActive,
        dto.notes,
        id,
      ]);

      // Update Classes
      if (dto.classes !== undefined) {
        await client.query(
          `DELETE FROM master_transport_classes WHERE transport_id = $1`,
          [id],
        );
        for (const cls of dto.classes) {
          await client.query(
            `INSERT INTO master_transport_classes (
              transport_id, class_name, description, sbu_level_info, price_limit_type, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              cls.className,
              cls.description || null,
              cls.sbuLevelInfo || "Semua Pegawai & Staf Operasional",
              cls.priceLimitType || "Plafon Standar SBU",
              cls.isActive ?? true,
            ],
          );
        }
      }

      // Update User Mappings
      if (dto.assignedUsers !== undefined) {
        await client.query(
          `DELETE FROM user_transport_mappings WHERE transport_id = $1`,
          [id],
        );
        for (const usr of dto.assignedUsers) {
          await client.query(
            `INSERT INTO user_transport_mappings (
              user_id, transport_id, system_role, unit_kerja_nama, can_issue_eticket, can_validate_sbu, can_access_billing
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              usr.userId,
              id,
              usr.systemRole,
              usr.unitKerjaNama,
              usr.canIssueEticket ?? true,
              usr.canValidateSbu ?? true,
              usr.canAccessBilling ?? true,
            ],
          );
        }
      }

      await client.query("COMMIT");
      return this.getVendorById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // 6. Delete Vendor
  async deleteVendor(id: number) {
    const res = await this.pool.query(
      `DELETE FROM master_transports WHERE id = $1 RETURNING id`,
      [id],
    );
    return res.rowCount ? res.rowCount > 0 : false;
  }
}
