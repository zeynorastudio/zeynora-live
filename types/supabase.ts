export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_uid: string | null
          email: string
          full_name: string | null
          phone: string | null
          role: 'super_admin' | 'admin' | 'staff' | 'customer' | null
          is_active: boolean | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_uid?: string | null
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'super_admin' | 'admin' | 'staff' | 'customer' | null
          is_active?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_uid?: string | null
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'super_admin' | 'admin' | 'staff' | 'customer' | null
          is_active?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          uid: string
          name: string
          slug: string
          description: string | null
          category_id: string | null
          super_category: string | null
          subcategory: string | null
          category_override: string | null
          style: string | null
          occasion: 'wedding' | 'festive' | 'casual' | 'party' | 'formal' | 'semi_formal' | 'daily' | 'premium' | null
          season: 'summer' | 'winter' | 'spring' | 'autumn' | 'all_seasons' | null
          featured: boolean | null
          best_selling: boolean | null
          new_launch: boolean | null
          active: boolean | null
          price: number
          strike_price: number | null
          sale_price: number | null
          on_sale: boolean | null
          cost_price: number | null
          profit_percent: number | null
          profit_amount: number | null
          tags: string[] | null
          main_image_path: string | null
          sort_order: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          uid: string
          name: string
          slug: string
          description?: string | null
          category_id?: string | null
          super_category?: string | null
          subcategory?: string | null
          category_override?: string | null
          style?: string | null
          occasion?: 'wedding' | 'festive' | 'casual' | 'party' | 'formal' | 'semi_formal' | 'daily' | 'premium' | null
          season?: 'summer' | 'winter' | 'spring' | 'autumn' | 'all_seasons' | null
          featured?: boolean | null
          best_selling?: boolean | null
          new_launch?: boolean | null
          active?: boolean | null
          price?: number
          strike_price?: number | null
          sale_price?: number | null
          on_sale?: boolean | null
          cost_price?: number | null
          profit_percent?: number | null
          profit_amount?: number | null
          tags?: string[] | null
          main_image_path?: string | null
          sort_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          uid?: string
          name?: string
          slug?: string
          description?: string | null
          category_id?: string | null
          super_category?: string | null
          subcategory?: string | null
          category_override?: string | null
          style?: string | null
          occasion?: 'wedding' | 'festive' | 'casual' | 'party' | 'formal' | 'semi_formal' | 'daily' | 'premium' | null
          season?: 'summer' | 'winter' | 'spring' | 'autumn' | 'all_seasons' | null
          featured?: boolean | null
          best_selling?: boolean | null
          new_launch?: boolean | null
          active?: boolean | null
          price?: number
          strike_price?: number | null
          sale_price?: number | null
          on_sale?: boolean | null
          cost_price?: number | null
          profit_percent?: number | null
          profit_amount?: number | null
          tags?: string[] | null
          main_image_path?: string | null
          sort_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_uid: string | null
          sku: string
          color_id: string | null
          size_id: string | null
          stock: number | null
          price: number | null
          cost: number | null
          active: boolean | null
          images: Json | null
          tags: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_uid?: string | null
          sku: string
          color_id?: string | null
          size_id?: string | null
          stock?: number | null
          price?: number | null
          cost?: number | null
          active?: boolean | null
          images?: Json | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_uid?: string | null
          sku?: string
          color_id?: string | null
          size_id?: string | null
          stock?: number | null
          price?: number | null
          cost?: number | null
          active?: boolean | null
          images?: Json | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_id: string | null
          description: string | null
          is_featured: boolean | null
          hero_image_path: string | null
          tile_image_path: string | null
          banner_image_path: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_id?: string | null
          description?: string | null
          is_featured?: boolean | null
          hero_image_path?: string | null
          tile_image_path?: string | null
          banner_image_path?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          description?: string | null
          is_featured?: boolean | null
          hero_image_path?: string | null
          tile_image_path?: string | null
          banner_image_path?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      colors: {
        Row: {
          id: string
          name: string
          slug: string
          hex_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          hex_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          hex_code?: string | null
          created_at?: string
        }
      }
      sizes: {
        Row: {
          id: string
          code: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          label?: string | null
          created_at?: string
        }
      }
      product_colors: {
        Row: {
          id: string
          product_uid: string | null
          color_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_uid?: string | null
          color_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_uid?: string | null
          color_id?: string | null
          created_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_uid: string | null
          image_path: string
          type: string | null
          display_order: number | null
          alt_text: string | null
          variant_sku: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_uid?: string | null
          image_path: string
          type?: string | null
          display_order?: number | null
          alt_text?: string | null
          variant_sku?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_uid?: string | null
          image_path?: string
          type?: string | null
          display_order?: number | null
          alt_text?: string | null
          variant_sku?: string | null
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          banner_image_path: string | null
          is_seasonal: boolean | null
          is_active: boolean | null
          product_uids: string[] | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          banner_image_path?: string | null
          is_seasonal?: boolean | null
          is_active?: boolean | null
          product_uids?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          banner_image_path?: string | null
          is_seasonal?: boolean | null
          is_active?: boolean | null
          product_uids?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
      }
      carts: {
        Row: {
          id: string
          session_id: string | null
          user_id: string | null
          currency: string | null
          subtotal: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          currency?: string | null
          subtotal?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          currency?: string | null
          subtotal?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string | null
          product_variant_id: string | null
          quantity: number
          price_snapshot: number
          created_at: string
        }
        Insert: {
          id?: string
          cart_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          price_snapshot: number
          created_at?: string
        }
        Update: {
          id?: string
          cart_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          price_snapshot?: number
          created_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          product_uid: string
          variant_sku: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_uid: string
          variant_sku?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_uid?: string
          variant_sku?: string | null
          created_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string | null
          full_name: string | null
          phone: string | null
          line1: string | null
          line2: string | null
          city: string | null
          state: string | null
          pincode: string | null
          country: string | null
          is_default: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          phone?: string | null
          line1?: string | null
          line2?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          country?: string | null
          is_default?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          phone?: string | null
          line1?: string | null
          line2?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          country?: string | null
          is_default?: boolean | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          customer_id: string | null // Phase 3.1: Link to customers table
          guest_phone: string | null // Phase 3.1: For guest order tracking
          guest_email: string | null // Phase 3.1: Guest email
          order_status: 'created' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'paid' | null // Phase 3.1 + Phase 3.2
          billing_address_id: string | null
          shipping_address_id: string | null
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null
          shipping_status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rto' | 'returned' | 'cancelled' | null
          currency: string | null
          subtotal: number | null
          shipping_fee: number | null
          internal_shipping_cost: number | null // Phase 3.1: What we pay to carrier
          assumed_weight: number | null // Phase 3.4: Assumed weight (kg) used for shipping
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          coupon_code: string | null
          shiprocket_shipment_id: string | null
          payment_provider: string | null
          payment_provider_response: Json | null
          razorpay_order_id: string | null // Phase 3.2: Razorpay order ID
          payment_method: string | null // Phase 3.2: Payment method (card, netbanking, wallet, upi)
          paid_at: string | null // Phase 3.2: Timestamp when payment was captured
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          customer_id?: string | null
          guest_phone?: string | null
          guest_email?: string | null
          order_status?: 'created' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'paid' | null // Phase 3.2: Added 'paid'
          billing_address_id?: string | null
          shipping_address_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
          shipping_status?: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rto' | 'returned' | 'cancelled' | null
          currency?: string | null
          subtotal?: number | null
          shipping_fee?: number | null
          internal_shipping_cost?: number | null
          assumed_weight?: number | null // Phase 3.4
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          coupon_code?: string | null
          shiprocket_shipment_id?: string | null
          payment_provider?: string | null
          payment_provider_response?: Json | null
          razorpay_order_id?: string | null // Phase 3.2
          payment_method?: string | null // Phase 3.2
          paid_at?: string | null // Phase 3.2
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string | null
          customer_id?: string | null
          guest_phone?: string | null
          guest_email?: string | null
          order_status?: 'created' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'paid' | null // Phase 3.2: Added 'paid'
          billing_address_id?: string | null
          shipping_address_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
          shipping_status?: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rto' | 'returned' | 'cancelled' | null
          currency?: string | null
          subtotal?: number | null
          shipping_fee?: number | null
          internal_shipping_cost?: number | null
          assumed_weight?: number | null // Phase 3.4
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          coupon_code?: string | null
          shiprocket_shipment_id?: string | null
          payment_provider?: string | null
          payment_provider_response?: Json | null
          razorpay_order_id?: string | null // Phase 3.2
          payment_method?: string | null // Phase 3.2
          paid_at?: string | null // Phase 3.2
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_uid: string | null
          variant_id: string | null
          sku: string | null
          name: string | null
          quantity: number
          price: number
          cost_price: number | null // Phase 3.1: For margin calculation
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_uid?: string | null
          variant_id?: string | null
          sku?: string | null
          name?: string | null
          cost_price?: number | null
          quantity?: number
          price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          product_uid?: string | null
          variant_id?: string | null
          sku?: string | null
          name?: string | null
          quantity?: number
          price?: number
          subtotal?: number
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          event: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          event: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          event?: string
          details?: Json | null
          created_at?: string
        }
      }
      homepage_hero: {
        Row: {
          id: string
          title: string | null
          subtitle: string | null
          cta_text: string | null
          cta_url: string | null
          desktop_image: string
          desktop_video: string | null
          mobile_image: string | null
          mobile_video: string | null
          order_index: number
          visible: boolean
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          subtitle?: string | null
          cta_text?: string | null
          cta_url?: string | null
          desktop_image: string
          desktop_video?: string | null
          mobile_image?: string | null
          mobile_video?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          subtitle?: string | null
          cta_text?: string | null
          cta_url?: string | null
          desktop_image?: string
          desktop_video?: string | null
          mobile_image?: string | null
          mobile_video?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
      }
      homepage_categories: {
        Row: {
          id: string
          category_id: string
          image: string
          title_override: string | null
          url_override: string | null
          order_index: number
          visible: boolean
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          image: string
          title_override?: string | null
          url_override?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          image?: string
          title_override?: string | null
          url_override?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
      }
      homepage_sections: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          source_type: 'automatic' | 'manual'
          source_meta: Json | null
          product_count: number
          sort_order: string | null
          order_index: number
          visible: boolean
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          source_type: 'automatic' | 'manual'
          source_meta?: Json | null
          product_count?: number
          sort_order?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          source_type?: 'automatic' | 'manual'
          source_meta?: Json | null
          product_count?: number
          sort_order?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
      }
      homepage_section_products: {
        Row: {
          id: string
          section_id: string
          product_id: string
          order_index: number
        }
        Insert: {
          id?: string
          section_id: string
          product_id: string
          order_index?: number
        }
        Update: {
          id?: string
          section_id?: string
          product_id?: string
          order_index?: number
        }
      }
      homepage_banners: {
        Row: {
          id: string
          title: string | null
          desktop_image: string
          mobile_image: string | null
          link: string | null
          order_index: number
          visible: boolean
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          desktop_image: string
          mobile_image?: string | null
          link?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          desktop_image?: string
          mobile_image?: string | null
          link?: string | null
          order_index?: number
          visible?: boolean
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
      }
      homepage_settings: {
        Row: {
          id: string
          hero_max_height_desktop: number
          hero_max_height_mobile: number
          page_padding: number
          bg_color: string
          lazy_load_enabled: boolean
          section_dividers_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hero_max_height_desktop?: number
          hero_max_height_mobile?: number
          page_padding?: number
          bg_color?: string
          lazy_load_enabled?: boolean
          section_dividers_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hero_max_height_desktop?: number
          hero_max_height_mobile?: number
          page_padding?: number
          bg_color?: string
          lazy_load_enabled?: boolean
          section_dividers_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      vw_products_min_variant_price: {
        Row: {
          uid: string
          name: string
          display_price: number
        }
      }
    }
    Functions: {
      [_: string]: never
    }
    Enums: {
      z_role_type: 'super_admin' | 'admin' | 'staff' | 'customer'
      z_fabric_type: 'pure_silk' | 'cotton_silk' | 'georgette' | 'chiffon' | 'crepe' | 'banarasi_silk' | 'kanjivaram_silk' | 'chanderi_cotton' | 'lawn' | 'velvet' | 'cotton' | 'organza' | 'net' | 'satin' | 'silk'
      z_work_type: 'zari_work' | 'embroidery' | 'print' | 'hand_painted' | 'block_print' | 'kalamkari' | 'bandhani' | 'sequin_work' | 'mirror_work' | 'thread_work'
      z_season: 'summer' | 'winter' | 'spring' | 'autumn' | 'all_seasons'
      z_occasion: 'wedding' | 'festive' | 'casual' | 'party' | 'formal' | 'semi_formal' | 'daily' | 'premium'
      z_product_status: 'active' | 'draft' | 'archived'
      z_payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
      z_shipping_status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rto' | 'returned' | 'cancelled'
    }
  }
}
