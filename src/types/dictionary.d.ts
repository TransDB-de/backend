type primitive = string | number | boolean

export default interface IDictionary {
	[key: string]: IDictionary | primitive | Array<primitive> | Array<IDictionary>
}
