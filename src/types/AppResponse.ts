import { AppData } from './AppData';

export interface AppResponse extends AppData {
    id: number;
    position: number;
    is_online: boolean;
    created_at: string;
    updated_at: string;
}
