/* ============================================================
   STOCKIST data contract (from the design handoff).
   Use these interfaces as the API/DB schema when building the
   backend; the front end already produces/consumes these shapes.
   ============================================================ */

export type Category = 'Food & Drink' | 'Apparel' | 'Home' | 'Beauty' | 'Accessories';

export interface Brand {
  id: string;            // 'b1'…'b8'
  name: string;          // 'Maison Verre'
  category: Category;
  loc: string;           // 'Bordeaux, FR'
  tagline: string;
}

export interface Product {
  id: string;            // 'p1'…'p24'
  b: string;             // brandId (FK → Brand.id)
  name: string;
  cat: Category;
  unit: string;          // wholesale unit, e.g. 'case of 12', 'pack of 6'
  wp: number;            // wholesale price (per unit), USD
  rrp: number;           // recommended retail price → margin = 1 - wp/rrp
  moq: number;           // minimum order quantity (in units)
  stock: number;         // units available; < 20 shows "low stock"
  tint: string;          // oklch swatch for the placeholder image
  marks: string;         // 2-letter monogram on the placeholder
  blurb: string;         // PDP description
  imageUrl?: string;     // ADD in production (replaces the Ph placeholder)
}

export interface OrderItem { id: string; qty: number; }   // id = productId
export type OrderStatus = 'new' | 'packing' | 'shipped';  // STATUS_FLOW, in order
export interface Shipment {
  id: string;
  brandId: string;
  brandName: string;
  status: OrderStatus;
  items: OrderItem[];
}
export interface Order {
  id: string;            // 'ORD-4472'
  retailer: string;      // retailer account name
  items: OrderItem[];
  status?: OrderStatus;  // seller view: this studio's shipment
  shipmentId?: string;
  shipments: Shipment[];
  placedAt: number;      // epoch ms
  note: string;
}

// Client/session state (the prototype's persisted blob)
export interface AppState {
  cart: Record<string, number>;                  // productId → qty
  orders: Order[];
  retailer: string;                              // current retailer identity
  favorites: string[];                           // saved brandIds
}
