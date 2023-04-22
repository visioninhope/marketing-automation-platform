import { JSONSchemaType } from 'ajv'
import { validate } from '../core/validate'
import crypto from 'crypto'
import Hashids from 'hashids'
import { differenceInSeconds } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

export const pluralize = (noun: string, count = 2, suffix = 's') => `${noun}${count !== 1 ? suffix : ''}`

export const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]

export const pick = <T extends object, K extends keyof T> (obj: T, keys: K[]): Pick<T, K> => {
    const ret: any = {}
    keys.forEach(key => {
        ret[key] = obj[key]
    })
    return ret
}

export const randomInt = (min = 0, max = 100): number => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const prune = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null && v !== '')
            .map(([k, v]) => [k, v === Object(v) ? prune(v) : v]),
    )
}

export const snakeCase = (str: string): string => str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map(x => x.toLowerCase())
    .join('_') ?? ''

export const uuid = (): string => {
    return crypto.randomUUID()
}

export const secondsAgo = (timestamp: Date | number) => {
    return differenceInSeconds(Date.now(), timestamp)
}

const hashCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
const hashMinimumLength = 10
export const encodeHashid = function(value: number): string {
    const hashids = new Hashids(
        process.env.APP_SECRET,
        hashMinimumLength,
        hashCharacters,
    )
    return hashids.encode(value)
}

export const decodeHashid = function(value?: string | null): number | undefined {
    if (!value) return
    const hashids = new Hashids(
        process.env.APP_SECRET,
        hashMinimumLength,
        hashCharacters,
    )
    return hashids.decode(value)?.[0] as number | undefined
}

export const combineURLs = (parts: string[], sep = '/'): string => {
    return parts
        .map(part => {
            const part2 = part.endsWith(sep) ? part.substring(0, part.length - 1) : part
            return part2.startsWith(sep) ? part2.substr(1) : part2
        })
        .join(sep)
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const removeKey = <T, O extends keyof T>(propKey: O, { [propKey]: propValue, ...rest }: T): Omit<T, O> => rest

export const batch = <T>(arr: T[], size: number) => {
    const result: T[][] = []
    for (let i = 0, len = arr.length; i < len; i += size) {
        result.push(arr.slice(i, i + size))
    }
    return result
}

export const parseLocale = (locale: string): string | undefined => {
    return locale.slice(-1) === '-'
        ? locale.slice(0, -1)
        : locale
}

export const partialMatchLocale = (locale1?: string, locale2?: string) => {
    const locale1Root = locale1?.split('-')[0]
    const locale2Root = locale2?.split('-')[0]
    return locale1 === locale2 || locale1Root === locale2Root
}

export const crossTimezoneCopy = (
    date: Date,
    fromTimezone: string,
    toTimezone: string,
) => {
    const baseDate = utcToZonedTime(date, fromTimezone)

    const utcDate = new Date(baseDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(baseDate.toLocaleString('en-US', { timeZone: toTimezone }))
    const offset = utcDate.getTime() - tzDate.getTime()

    baseDate.setTime(baseDate.getTime() + offset)
    return baseDate
}

export function extractQueryParams<T extends Record<string, any>>(search: URLSearchParams | Record<string, undefined | string | string[]>, schema: JSONSchemaType<T>) {
    return validate(schema, Object.entries<JSONSchemaType<any>>(schema.properties).reduce((a, [name, def]) => {
        let values!: string[]

        if (search instanceof URLSearchParams) {
            values = search.getAll(name)
        } else {
            const v = search[name]
            values = Array.isArray(v) ? v : v ? [v] : []
        }
        if (def.type !== 'array' && values.length > 1) {
            values = values.slice(0, 1)
        }
        if (values.length) {
            const transformed = values.map(v => {
                const type = def.type === 'array' ? def.items.type : def.type
                if (type === 'boolean') {
                    return Boolean(v && 'ty1'.includes(v.charAt(0).toLowerCase()))
                } else if (type === 'integer') {
                    const i = parseInt(v, 10)
                    return isNaN(i) ? undefined : i
                } else if (type === 'number') {
                    const f = parseFloat(v)
                    return isNaN(f) ? undefined : f
                } else if (type === 'array' || type === 'object') {
                    return JSON.parse(v)
                } else {
                    return v
                }
            })
            if (def.type === 'array') {
                a[name] = transformed
            } else {
                a[name] = transformed.at(0)
            }
        }
        if (a[name] === undefined) {
            a[name] = def.default
        }
        return a
    }, {} as Record<string, any>))
}

export function firstQueryParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
