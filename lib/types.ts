export type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  condition: string;
  status: 'available' | 'sold';
  tone: string;
  description: string;
  image_url: string | null;
};

export type Order = {
  id: string;
  code: string;
  customer_name: string;
  facebook_profile: string;
  phone: string;
  delivery_method: string;
  address: string;
  notes: string;
  total: number;
  status: string;
  created_at: string;
  items: {
    book_id: number;
    title: string;
    miner_position: number;
  }[];
};

export type ClaimResult = {
  code: string;
  total: number;
  items: {
    book_id: number;
    title: string;
    position: number;
  }[];
};
