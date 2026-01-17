export interface Location {
    _id: string;
    name: string;
    code: string;
    type: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LocationOption {
    value: string;
    label: string;
    type: string;
}