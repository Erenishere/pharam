export const API_CONFIG = {
    BASE_URL: 'http://localhost:3001/api/v1',
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth/login',
            REFRESH: '/auth/refresh',
            LOGOUT: '/auth/logout',
            PROFILE: '/auth/profile',
            VERIFY: '/auth/verify'
        },
        USERS: {
            BASE: '/users',
            BY_ID: (id: string) => `/users/${id}`,
            BY_ROLE: (role: string) => `/users/role/${role}`,
            TOGGLE_STATUS: (id: string) => `/users/${id}/toggle-status`,
            UPDATE_ROLE: (id: string) => `/users/${id}/role`,
            RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,
            RESTORE: (id: string) => `/users/${id}/restore`,
            STATISTICS: '/users/statistics',
            PROFILE_ME: '/users/profile/me',
            CHANGE_PASSWORD: '/users/profile/change-password'
        },
        CUSTOMERS: {
            BASE: '/customers',
            BY_ID: (id: string) => `/customers/${id}`,
            BY_CODE: (code: string) => `/customers/code/${code}`,
            BY_TYPE: (type: string) => `/customers/type/${type}`,
            TOGGLE_STATUS: (id: string) => `/customers/${id}/toggle-status`,
            RESTORE: (id: string) => `/customers/${id}/restore`,
            STATISTICS: '/customers/statistics'
        },
        SUPPLIERS: {
            BASE: '/suppliers',
            BY_ID: (id: string) => `/suppliers/${id}`,
            BY_CODE: (code: string) => `/suppliers/code/${code}`,
            BY_TYPE: (type: string) => `/suppliers/type/${type}`,
            TOGGLE_STATUS: (id: string) => `/suppliers/${id}/toggle-status`,
            RESTORE: (id: string) => `/suppliers/${id}/restore`,
            STATISTICS: '/suppliers/statistics'
        }
    }
};

export const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user'
};
