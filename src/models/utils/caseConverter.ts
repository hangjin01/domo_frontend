// src/models/utils/caseConverter.ts
// Snake Case ↔ Camel Case 재귀 변환 유틸리티

/**
 * snake_case 문자열을 camelCase로 변환
 */
export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCase 문자열을 snake_case로 변환
 */
export function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 값이 순수 객체인지 확인 (배열, null, Date 등 제외)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof RegExp) &&
        !(value instanceof Map) &&
        !(value instanceof Set)
    );
}

/**
 * 객체/배열의 모든 키를 재귀적으로 snake_case → camelCase 변환
 *
 * @example
 * snakeToCamelDeep({ user_id: 1, card_data: { column_id: 2 } })
 * // => { userId: 1, cardData: { columnId: 2 } }
 *
 * @example
 * snakeToCamelDeep([{ user_id: 1 }, { user_id: 2 }])
 * // => [{ userId: 1 }, { userId: 2 }]
 */
export function snakeToCamelDeep<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => snakeToCamelDeep(item)) as T;
    }

    if (isPlainObject(data)) {
        const result: Record<string, unknown> = {};

        for (const key of Object.keys(data)) {
            const camelKey = snakeToCamel(key);
            const value = data[key];
            result[camelKey] = snakeToCamelDeep(value);
        }

        return result as T;
    }

    return data;
}