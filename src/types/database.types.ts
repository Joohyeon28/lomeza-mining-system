export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	[schema: string]: {
		Tables: Record<
			string,
			{
				Row: Record<string, unknown>
				Insert: Record<string, unknown>
				Update: Record<string, unknown>
				Relationships: Array<unknown>
			}
		>
		Views: Record<string, unknown>
		Functions: Record<string, unknown>
		Enums: Record<string, unknown>
		CompositeTypes: Record<string, unknown>
	}
}
