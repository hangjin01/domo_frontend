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
    // null/undefined 처리
    if (data === null || data === undefined) {
        return data;
    }

    // 배열 처리: 각 요소를 재귀 변환
    if (Array.isArray(data)) {
        return data.map((item) => snakeToCamelDeep(item)) as T;
    }

    // 순수 객체 처리: 모든 키와 값을 재귀 변환
    if (isPlainObject(data)) {
        const result: Record<string, unknown> = {};

        for (const key of Object.keys(data)) {
            const camelKey = snakeToCamel(key);
            const value = data[key];
            result[camelKey] = snakeToCamelDeep(value);
        }

        return result as T;
    }

    // 원시 값(string, number, boolean 등)은 그대로 반환
    return data;
}

/**
 * 객체/배열의 모든 키를 재귀적으로 camelCase → snake_case 변환
 *
 * @example
 * camelToSnakeDeep({ userId: 1, cardData: { columnId: 2 } })
 * // => { user_id: 1, card_data: { column_id: 2 } }
 */
export function camelToSnakeDeep<T>(data: T): T {
    // null/undefined 처리
    if (data === null || data === undefined) {
        return data;
    }

    // 배열 처리
    if (Array.isArray(data)) {
        return data.map((item) => camelToSnakeDeep(item)) as T;
    }

    // 순수 객체 처리
    if (isPlainObject(data)) {
        const result: Record<string, unknown> = {};

        for (const key of Object.keys(data)) {
            const snakeKey = camelToSnake(key);
            const value = data[key];
            result[snakeKey] = camelToSnakeDeep(value);
        }

        return result as T;
    }

    // 원시 값은 그대로 반환
    return data;
}

/**
 * 특정 키만 선택적으로 변환 (화이트리스트 방식)
 * 백엔드 응답에서 일부 필드만 camelCase로 변환해야 할 때 사용
 */
export function snakeToCamelKeys<T extends Record<string, unknown>>(
    data: T,
    keys: string[]
): T {
    const result = { ...data };

    for (const snakeKey of keys) {
        if (snakeKey in result) {
            const camelKey = snakeToCamel(snakeKey);
            if (camelKey !== snakeKey) {
                result[camelKey as keyof T] = result[snakeKey as keyof T];
                delete result[snakeKey as keyof T];
            }
        }
    }

    return result;
}

/**
 * 백엔드 Card 응답의 주요 필드 매핑 (최적화된 버전)
 * 전체 재귀 변환 대신 알려진 필드만 빠르게 변환
 */
export function mapBackendCardFields<T extends Record<string, unknown>>(card: T): T {
    const fieldMap: Record<string, string> = {
        column_id: 'columnId',
        card_type: 'cardType',
        start_date: 'startDate',
        due_date: 'dueDate',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        project_id: 'projectId',
        user_id: 'userId',
        board_id: 'boardId',
        local_x: 'localX',
        local_y: 'localY',
        parent_id: 'parentId',
        from_card_id: 'from',
        to_card_id: 'to',
        source_handle: 'sourceHandle',
        target_handle: 'targetHandle',
        file_id: 'fileId',
        owner_id: 'ownerId',
        file_size: 'fileSize',
        latest_version: 'latestVersion',
        profile_image: 'profileImage',
        is_student_verified: 'isStudentVerified',
    };

    const result: Record<string, unknown> = {};

    for (const key of Object.keys(card)) {
        const mappedKey = fieldMap[key] || key;
        let value = card[key];

        // 중첩 객체/배열 처리
        if (Array.isArray(value)) {
            value = value.map((item) =>
                isPlainObject(item) ? mapBackendCardFields(item as Record<string, unknown>) : item
            );
        } else if (isPlainObject(value)) {
            value = mapBackendCardFields(value as Record<string, unknown>);
        }

        result[mappedKey] = value;
    }

    return result as T;
}