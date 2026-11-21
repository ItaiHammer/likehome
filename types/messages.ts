// /api/messages types
export interface Message {
  id: string;
  hotel_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  hotels?: {
    name: string;
  };
}

export interface HotelRecipient {
  account_id: string;
  email: string;
  full_name: string;
  last_check_in: string | null;
  last_status: string | null;
}

export interface SendMessagePayload {
  hotel_id: string;
  subject: string;
  body: string;
  recipient_ids: string | string[];
}

export type ApiResponse<T> = {
  data: T | null;
  error: any | null;
};