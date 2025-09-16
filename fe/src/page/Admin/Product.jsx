import React, { useState, useEffect, useRef } from "react";
import {
  getAllProducts,
  getAllCategories,
  transformProductData,
  createProduct,
  updateProduct,
  deleteProduct,
  subscribeToProducts,
  unsubscribeFromProducts,
  subscribeToCategories,
  unsubscribeFromCategories,
} from "../../services/productService";
import {
  transformCategoryData,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";
import BottomNavbar from "../../component/BottomNavbar";
import { useNotification } from "../../hooks/useNotification";
import NotificationToast from "../../components/NotificationToast";

function AdminProduct() {
  // State cho sản phẩm
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products"); // "products" hoặc "categories"

  // State cho form sản phẩm
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    product_name: "",
    product_price: "",
    product_img: "",
    category_id: "",
    isActive: true,
  });

  // State cho form category
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
  });

  // State cho UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Refs cho real-time subscriptions
  const productSubscriptionRef = useRef(null);
  const categorySubscriptionRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Notification system
  const { notification, showNotification, hideNotification } =
    useNotification();

  // Load data and setup real-time subscriptions
  useEffect(() => {
    loadData();

    // Subscribe to product changes
    const productSubscription = subscribeToProducts((payload) => {
      console.log("Product change received:", payload);

      if (payload.eventType === "INSERT") {
        // New product added - reload data to get full product with category
        loadData();
      } else if (payload.eventType === "UPDATE") {
        // Product updated - reload data
        loadData();
      } else if (payload.eventType === "DELETE") {
        // Product deleted - remove from state
        setProducts((prevProducts) =>
          prevProducts.filter(
            (product) => product.id !== payload.old.product_id
          )
        );
      }
    });

    // Subscribe to category changes
    const categorySubscription = subscribeToCategories((payload) => {
      console.log("Category change received:", payload);

      if (payload.eventType === "INSERT") {
        // New category added - reload data
        loadData();
      } else if (payload.eventType === "UPDATE") {
        // Category updated - reload data
        loadData();
      } else if (payload.eventType === "DELETE") {
        // Category deleted - remove from state
        setCategories((prevCategories) =>
          prevCategories.filter(
            (category) => category.id !== payload.old.category_id
          )
        );
      }
    });

    productSubscriptionRef.current = productSubscription;
    categorySubscriptionRef.current = categorySubscription;

    // Cleanup subscriptions on unmount
    return () => {
      if (productSubscriptionRef.current) {
        unsubscribeFromProducts(productSubscriptionRef.current);
      }
      if (categorySubscriptionRef.current) {
        unsubscribeFromCategories(categorySubscriptionRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
      ]);

      setProducts(transformProductData(productsData));
      setCategories(transformCategoryData(categoriesData));
    } catch (error) {
      console.error("Error loading data:", error);
      showNotification("Có lỗi xảy ra khi tải dữ liệu!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ========== PRODUCT FUNCTIONS ==========

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (
      !productForm.product_name ||
      !productForm.product_price ||
      !productForm.category_id
    ) {
      showNotification("Vui lòng điền đầy đủ thông tin!", "warning");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingProduct) {
        // Cập nhật sản phẩm
        await updateProduct(editingProduct.id, productForm);
        showNotification("Cập nhật sản phẩm thành công!", "success");
      } else {
        // Tạo sản phẩm mới
        await createProduct(productForm);
        showNotification("Tạo sản phẩm thành công!", "success");
      }

      // Reset form và reload data
      resetProductForm();
      loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      showNotification("Có lỗi xảy ra khi lưu sản phẩm!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      product_name: product.name,
      product_price: product.price.toString(),
      product_img: product.image.startsWith("http") ? product.image : "",
      category_id: product.categoryId.toString(),
      isActive: product.isActive,
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      await deleteProduct(productId);
      showNotification("Xóa sản phẩm thành công!", "success");
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      showNotification("Có lỗi xảy ra khi xóa sản phẩm!", "error");
    }
  };

  const resetProductForm = () => {
    setProductForm({
      product_name: "",
      product_price: "",
      product_img: "",
      category_id: "",
      isActive: true,
    });
    setEditingProduct(null);
    setShowProductForm(false);
  };

  // ========== CATEGORY FUNCTIONS ==========

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.category_name.trim()) {
      showNotification("Vui lòng nhập tên danh mục!", "warning");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingCategory) {
        // Cập nhật category
        await updateCategory(editingCategory.id, categoryForm);
        showNotification("Cập nhật danh mục thành công!", "success");
      } else {
        // Tạo category mới
        await createCategory(categoryForm);
        showNotification("Tạo danh mục thành công!", "success");
      }

      // Reset form và reload data
      resetCategoryForm();
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      showNotification("Có lỗi xảy ra khi lưu danh mục!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      category_name: category.name,
    });
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa danh mục này? Tất cả sản phẩm trong danh mục sẽ bị ảnh hưởng!"
      )
    )
      return;

    try {
      await deleteCategory(categoryId);
      showNotification("Xóa danh mục thành công!", "success");
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotification("Có lỗi xảy ra khi xóa danh mục!", "error");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      category_name: "",
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // ========== FILTER & SEARCH ==========

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-xl font-semibold text-gray-700">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">🛠️ Quản lý Admin</h1>
          <p className="text-blue-100 text-sm">Quản lý sản phẩm và danh mục</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "products"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              📦 Sản phẩm ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "categories"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              🏷️ Danh mục ({categories.length})
            </button>
          </div>

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              {/* Search và Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    <option value="all">Tất cả danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowProductForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg">
                  ➕ Thêm sản phẩm
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                    {/* Product Image */}
                    <div className="w-full h-20 mb-3 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                      {product.image && product.image.startsWith("http") ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                      ) : null}
                      <span
                        className={`text-2xl ${
                          product.image && product.image.startsWith("http")
                            ? "hidden"
                            : "block"
                        }`}
                        style={{
                          display:
                            product.image && product.image.startsWith("http")
                              ? "none"
                              : "block",
                        }}>
                        {product.image && !product.image.startsWith("http")
                          ? product.image
                          : "☕"}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        {product.category}
                      </p>
                      <p className="text-sm font-bold text-green-600">
                        {product.price.toLocaleString("vi-VN")}đ
                      </p>
                      <div className="flex items-center mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                          {product.isActive ? "Đang bán" : "Tạm ngừng"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors duration-300">
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors duration-300">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-50">📦</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Không tìm thấy sản phẩm
                  </p>
                  <p className="text-sm text-gray-400">
                    Thử thay đổi từ khóa tìm kiếm hoặc danh mục
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Danh sách danh mục
                </h2>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg">
                  ➕ Thêm danh mục
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-lg text-white">🏷️</span>
                      </div>
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        {
                          products.filter((p) => p.categoryId === category.id)
                            .length
                        }{" "}
                        sản phẩm
                      </p>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors duration-300">
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors duration-300">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-50">🏷️</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Chưa có danh mục nào
                  </p>
                  <p className="text-sm text-gray-400">
                    Tạo danh mục đầu tiên để bắt đầu quản lý sản phẩm
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT FORM MODAL */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? "✏️ Sửa sản phẩm" : "➕ Thêm sản phẩm mới"}
              </h2>
              <button
                onClick={resetProductForm}
                className="text-gray-500 hover:text-gray-700 text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  value={productForm.product_name}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      product_name: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Nhập tên sản phẩm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giá (VNĐ) *
                </label>
                <input
                  type="number"
                  value={productForm.product_price}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      product_price: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập giá sản phẩm"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Danh mục *
                </label>
                <select
                  value={productForm.category_id}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required>
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL hình ảnh
                </label>
                <input
                  type="url"
                  value={productForm.product_img}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      product_img: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Sản phẩm đang bán
                  </span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors duration-300">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting
                    ? "⏳ Đang lưu..."
                    : editingProduct
                    ? "💾 Cập nhật"
                    : "➕ Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY FORM MODAL */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCategory ? "✏️ Sửa danh mục" : "➕ Thêm danh mục mới"}
              </h2>
              <button
                onClick={resetCategoryForm}
                className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  value={categoryForm.category_name}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      category_name: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập tên danh mục"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors duration-300">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting
                    ? "⏳ Đang lưu..."
                    : editingCategory
                    ? "💾 Cập nhật"
                    : "➕ Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={hideNotification}
      />
    </div>
  );
}

export default AdminProduct;
