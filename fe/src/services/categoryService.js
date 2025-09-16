import supabase from "../utils/supabase";

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

// Tạo category mới
export const createCategory = async (categoryData) => {
  try {
    const { data: category, error } = await supabase
      .from("category")
      .insert([
        {
          category_name: categoryData.category_name.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      throw error;
    }

    return category;
  } catch (error) {
    console.error("Error in createCategory:", error);
    throw error;
  }
};

// Cập nhật category
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const { data: category, error } = await supabase
      .from("category")
      .update({
        category_name: categoryData.category_name.trim(),
      })
      .eq("category_id", categoryId)
      .select()
      .single();

    if (error) {
      console.error("Error updating category:", error);
      throw error;
    }

    return category;
  } catch (error) {
    console.error("Error in updateCategory:", error);
    throw error;
  }
};

// Xóa category
export const deleteCategory = async (categoryId) => {
  try {
    const { error } = await supabase
      .from("category")
      .delete()
      .eq("category_id", categoryId);

    if (error) {
      console.error("Error deleting category:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
};

// Transform category data
export const transformCategoryData = (categories) => {
  return categories.map((category) => ({
    id: category.category_id, // UUID string
    name: category.category_name,
    createdAt: category.created_at,
  }));
};
