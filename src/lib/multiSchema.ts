import { getClientForSchema } from './supabaseClient'

export async function queryAllSchemas<T>(
  queryFn: (client: ReturnType<typeof getClientForSchema>, schema: string) => Promise<{ data: T[] | null; error: any }>,
  schemas: string[] = ['sileko', 'kalagadi', 'workshop']
): Promise<(T & { _schema?: string })[]> {
  const promises = schemas.map(async (schema) => {
    try {
      const client = getClientForSchema(schema)
      const res = await queryFn(client, schema)
      if (!res.error && res.data) {
        return (res.data as T[]).map(d => ({ ...(d as any), _schema: schema }))
      }
    } catch (e) {
      // swallow per-schema errors and continue
      // eslint-disable-next-line no-console
      console.warn(`Error querying schema ${schema}:`, e)
    }
    return [] as (T & { _schema?: string })[]
  })

  const results = await Promise.all(promises)
  // flatten
  return results.flat()
}

export const DEFAULT_MULTI_SCHEMAS = ['sileko', 'kalagadi', 'workshop']
