import * as db from "../../db";
import { sql } from "drizzle-orm";

/**
 * Audit Service
 * Logs all critical operations for compliance and debugging
 */
export async function auditLog(
    operation: string,
    entityType: string,
    entityId: number | null,
    data: any,
    result: any,
    userId?: string
): Promise<void> {
    const database = await db.getDb();
    if (!database) {
        console.error('Audit log failed: Database not available');
        return;
    }

    try {
        await database.execute(sql`
            INSERT INTO audit_log (
                operation, entity_type, entity_id, data, result, user_id, created_at
            ) VALUES (${operation}, ${entityType}, ${entityId}, ${JSON.stringify(data)}, ${JSON.stringify(result)}, ${userId || 'system'}, CURRENT_TIMESTAMP)
        `);
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw - audit log failure shouldn't break the main operation
    }
}

/**
 * Get audit logs for review
 */
export async function getAuditLogs(filters: {
    operation?: string;
    entityType?: string;
    entityId?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
} = {}) {
    const database = await db.getDb();
    if (!database) return [];

    const [logs] = await database.execute(sql`
        SELECT * FROM audit_log
        WHERE 1=1
        ${filters.operation ? sql`AND operation = ${filters.operation}` : sql``}
        ${filters.entityType ? sql`AND entity_type = ${filters.entityType}` : sql``}
        ${filters.entityId ? sql`AND entity_id = ${filters.entityId}` : sql``}
        ${filters.dateFrom ? sql`AND DATE(created_at) >= ${filters.dateFrom}` : sql``}
        ${filters.dateTo ? sql`AND DATE(created_at) <= ${filters.dateTo}` : sql``}
        ORDER BY created_at DESC
        ${filters.limit ? sql`LIMIT ${filters.limit}` : sql``}
    `) as any[];
    return logs;
}
