export type primitive = string | number | boolean | null

export default interface IDictionary {
	[key: string]: IDictionary | primitive | Array<primitive> | Array<IDictionary>
}
