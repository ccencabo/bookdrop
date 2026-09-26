export type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  is_on_sale: boolean;
  discount_amount: number;
  condition: string;
  status: 'available' | 'sold';
  tone: string;
  description: string;
  image_url: string | null;
  image_urls: string[];
  publish_at: string;
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
  tracking_number: string | null;
  status_updated_at: string;
  created_at: string;
  items: {
    book_id: number | null;
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

export type SellerUpdate = {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

export type PublicOrderStatus = {
  code: string;
  status: string;
  tracking_number: string | null;
  status_updated_at: string;
  created_at: string;
  items: string[];
};
