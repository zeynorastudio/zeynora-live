export interface HomepageHero {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  desktop_image: string;
  desktop_video: string | null;
  mobile_image: string | null;
  mobile_video: string | null;
  order_index: number;
  visible: boolean;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface HomepageCategory {
  id: string;
  category_id: string;
  image: string;
  title_override: string | null;
  order_index: number;
  visible: boolean;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: {
    name: string;
    slug: string;
  };
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle: string | null;
  source_type: 'automatic' | 'manual';
  source_meta: {
    automatic_type?: 'best_selling' | 'featured' | 'new_launch' | 'newest' | 'price_range' | 'on_sale';
    price_min?: number;
    price_max?: number;
  };
  product_count: number;
  sort_order: string | null;
  order_index: number;
  visible: boolean;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  // Joined
  products?: HomepageSectionProduct[];
}

export interface HomepageSectionProduct {
  id: string;
  section_id: string;
  product_id: string; // uid
  order_index: number;
  // Joined
  product?: {
    uid: string;
    name: string;
    slug: string;
    price: number;
    main_image_path: string | null;
    category_id: string | null;
  };
}

export interface HomepageBanner {
  id: string;
  title: string | null;
  desktop_image: string;
  mobile_image: string | null;
  link: string | null;
  order_index: number;
  visible: boolean;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface HomepageSettings {
  id: string;
  hero_max_height_desktop: number;
  hero_max_height_mobile: number;
  page_padding: number;
  bg_color: string;
  lazy_load_enabled: boolean;
  section_dividers_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HomepageConfig {
  hero: HomepageHero[];
  categories: HomepageCategory[];
  sections: HomepageSection[];
  banners: HomepageBanner[];
  settings: HomepageSettings | null;
  saleStrip: HomepageSaleStrip | null;
}

export interface HomepageSaleStrip {
  id: string;
  sale_text: string;
  status: 'draft' | 'published';
  visible: boolean;
  product_ids?: string[] | null;
  created_at: string;
  updated_at: string;
  // Auto-fetched on_sale products
  products?: Array<{
    uid: string;
    name: string;
    slug: string;
    price: number;
    main_image_path: string | null;
  }>;
}


