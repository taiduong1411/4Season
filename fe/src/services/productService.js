import supabase from "../utils/supabase";

// Lấy tất cả sản phẩm với category name
export const getAllProducts = async () => {
  try {
    const { data: products, error } = await supabase
      .from("product")
      .select(
        `
        product_id,
        product_name,
        product_price,
        product_img,
        isActive,
        created_at,
        category_id,
        category!product_category_id_fkey (
          category_id,
          category_name
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    return products || [];
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return [];
  }
};

// Lấy tất cả categories
export const getAllCategories = async () => {
  try {
    const { data: categories, error } = await supabase
      .from("category")
      .select(
        `
        category_id,
        category_name,
        created_at
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    return categories || [];
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return [];
  }
};

// Transform data từ Supabase thành format cho component
export const transformProductData = (products) => {
  return products.map((product) => {
    const transformedProduct = {
      id: product.product_id,
      name: product.product_name,
      price: product.product_price,
      category: product.category?.category_name || "Khác",
      categoryId: product.category_id,
      image: product.product_img || "☕",
      color: getRandomGradient(),
      isActive: product.isActive,
      createdAt: product.created_at,
    };

    return transformedProduct;
  });
};

// Tạo sản phẩm mới
export const createProduct = async (productData) => {
  try {
    const { data: product, error } = await supabase
      .from("product")
      .insert([
        {
          product_name: productData.product_name,
          product_price: parseInt(productData.product_price),
          product_img: productData.product_img || null,
          category_id: productData.category_id, // UUID không cần parseInt
          isActive: productData.isActive,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      throw error;
    }

    return product;
  } catch (error) {
    console.error("Error in createProduct:", error);
    throw error;
  }
};

// Cập nhật sản phẩm
export const updateProduct = async (productId, productData) => {
  try {
    const { data: product, error } = await supabase
      .from("product")
      .update({
        product_name: productData.product_name,
        product_price: parseInt(productData.product_price),
        product_img: productData.product_img || null,
        category_id: productData.category_id, // UUID không cần parseInt
        isActive: productData.isActive,
      })
      .eq("product_id", productId)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }

    return product;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    throw error;
  }
};

// Xóa sản phẩm
export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from("product")
      .delete()
      .eq("product_id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    throw error;
  }
};

// Upload hình ảnh lên Supabase Storage
export const uploadProductImage = async (file, productId) => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `product_${productId}_${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      throw uploadError;
    }

    // Lấy public URL
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    throw error;
  }
};

// Subscribe to real-time product updates
export const subscribeToProducts = (callback) => {
  const subscription = supabase
    .channel("products_changes")
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
        schema: "public",
        table: "product",
      },
      (payload) => {
        console.log("Product change received:", payload);
        // Normalize payload format
        const normalizedPayload = {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          record: payload.record,
        };
        callback(normalizedPayload);
      }
    )
    .subscribe();

  return subscription;
};

// Unsubscribe from real-time product updates
export const unsubscribeFromProducts = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};

// Subscribe to real-time category updates
export const subscribeToCategories = (callback) => {
  const subscription = supabase
    .channel("categories_changes")
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
        schema: "public",
        table: "category",
      },
      (payload) => {
        console.log("Category change received:", payload);
        // Normalize payload format
        const normalizedPayload = {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          record: payload.record,
        };
        callback(normalizedPayload);
      }
    )
    .subscribe();

  return subscription;
};

// Unsubscribe from real-time category updates
export const unsubscribeFromCategories = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};

// Helper function để tạo random gradient
const getRandomGradient = () => {
  const gradients = [
    "from-orange-400 to-yellow-500",
    "from-pink-400 to-red-500",
    "from-yellow-400 to-orange-500",
    "from-green-400 to-yellow-500",
    "from-purple-400 to-pink-500",
    "from-blue-400 to-indigo-500",
    "from-red-400 to-pink-500",
    "from-green-400 to-emerald-500",
    "from-amber-400 to-orange-500",
    "from-indigo-400 to-purple-500",
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};
