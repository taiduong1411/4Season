import React, { useState, useEffect, useRef } from "react";
import {
  getAllProducts,
  getAllCategories,
  transformProductData,
  subscribeToProducts,
  unsubscribeFromProducts,
  subscribeToCategories,
  unsubscribeFromCategories,
} from "../services/productService";
import { transformCategoryData } from "../services/categoryService";
import { createOrder } from "../services/orderService";
import { useNotification } from "../hooks/useNotification";
import NotificationToast from "../components/NotificationToast";

function Order() {
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [customerType, setCustomerType] = useState("table"); // "table" hoặc "walkin"
  const [showCart, setShowCart] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State cho phương thức thanh toán
  const [paymentMethods, setPaymentMethods] = useState({
    cash: false,
    transfer: false,
  });

  // State cho số tiền thanh toán từng phương thức
  const [paymentAmounts, setPaymentAmounts] = useState({
    cash: 0,
    transfer: 0,
  });

  // State cho data từ Supabase
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");

  // Refs cho real-time subscriptions
  const productSubscriptionRef = useRef(null);
  const categorySubscriptionRef = useRef(null);

  // Notification system
  const { notification, showNotification, hideNotification } =
    useNotification();

  // Danh sách topping (có thể lấy từ Supabase sau)
  const toppings = [
    {
      id: 18,
      name: "Đác rim thốt nốt",
      price: 10000,
      image: "🥥",
      color: "from-amber-400 to-yellow-500",
    },
    {
      id: 19,
      name: "Trân châu trắng",
      price: 5000,
      image: "⚪",
      color: "from-gray-300 to-gray-400",
    },
    {
      id: 20,
      name: "Trân châu đường đen",
      price: 5000,
      image: "⚫",
      color: "from-gray-600 to-gray-800",
    },
  ];

  // Options cho đường và đá
  const sugarOptions = [
    { id: "no-sugar", name: "Không đường", value: "no-sugar" },
    { id: "less-sugar", name: "Ít đường", value: "less-sugar" },
    { id: "normal-sugar", name: "Đường bình thường", value: "normal-sugar" },
    { id: "more-sugar", name: "Nhiều đường", value: "more-sugar" },
  ];

  const iceOptions = [
    { id: "no-ice", name: "Không đá", value: "no-ice" },
    { id: "less-ice", name: "Ít đá", value: "less-ice" },
    { id: "normal-ice", name: "Đá bình thường", value: "normal-ice" },
    { id: "more-ice", name: "Nhiều đá", value: "more-ice" },
  ];

  // Load data từ Supabase và setup real-time subscriptions
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load products và categories song song
        const [productsData, categoriesData] = await Promise.all([
          getAllProducts(),
          getAllCategories(),
        ]);

        // Transform data
        const transformedProducts = transformProductData(productsData);
        const transformedCategories = transformCategoryData(categoriesData);

        setProducts(transformedProducts);
        setCategories(transformedCategories);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time product changes
    const productSubscription = subscribeToProducts((payload) => {
      console.log("Order page - Product change received:", payload);

      if (payload.eventType === "INSERT") {
        // New product added - reload data to get full product with category
        loadData();
      } else if (payload.eventType === "UPDATE") {
        // Product updated (including isActive status) - reload data
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

    // Subscribe to real-time category changes
    const categorySubscription = subscribeToCategories((payload) => {
      console.log("Order page - Category change received:", payload);

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
  }, []);

  // Tạo danh sách categories để filter
  const filterCategories = ["Tất cả", ...categories.map((cat) => cat.name)];

  // Filter sản phẩm theo category với debug logs
  const filteredProducts = (() => {
    if (selectedCategory === "Tất cả") {
      return products;
    }

    if (selectedCategory === "Topping") {
      return toppings;
    }

    const filtered = products.filter((product) => {
      const productCategory = product.category?.trim() || "";
      const selectedCat = selectedCategory?.trim() || "";
      const matches = productCategory === selectedCat;
      return matches;
    });

    return filtered;
  })();

  // Thêm sản phẩm vào giỏ hàng
  const addToCart = (product) => {
    // Nếu là topping, không thêm trực tiếp
    if (toppings.find((t) => t.id === product.id)) {
      return;
    }

    // Kiểm tra isActive - chỉ cho phép order nếu isActive = true
    if (!product.isActive) {
      showNotification("Sản phẩm này hiện tại không khả dụng!", "warning");
      return;
    }

    const cartItem = {
      ...product,
      quantity: 1,
      toppings: [],
      note: "",
      isUpsize: false,
      sugarLevel: "normal-sugar",
      iceLevel: "normal-ice",
      cartId: Date.now() + Math.random(),
    };

    setCart([...cart, cartItem]);
  };

  // Thêm topping vào sản phẩm
  const addToppingToItem = (cartItemId, topping) => {
    setCart(
      cart.map((item) => {
        if (item.cartId === cartItemId) {
          const existingTopping = item.toppings.find(
            (t) => t.id === topping.id
          );
          if (existingTopping) {
            return {
              ...item,
              toppings: item.toppings.map((t) =>
                t.id === topping.id ? { ...t, quantity: t.quantity + 1 } : t
              ),
            };
          } else {
            return {
              ...item,
              toppings: [...item.toppings, { ...topping, quantity: 1 }],
            };
          }
        }
        return item;
      })
    );
  };

  // Cập nhật số lượng topping
  const updateToppingQuantity = (cartItemId, toppingId, quantity) => {
    setCart(
      cart.map((item) => {
        if (item.cartId === cartItemId) {
          if (quantity <= 0) {
            return {
              ...item,
              toppings: item.toppings.filter((t) => t.id !== toppingId),
            };
          } else {
            return {
              ...item,
              toppings: item.toppings.map((t) =>
                t.id === toppingId ? { ...t, quantity } : t
              ),
            };
          }
        }
        return item;
      })
    );
  };

  // Cập nhật số lượng sản phẩm chính
  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.cartId !== cartId));
    } else {
      setCart(
        cart.map((item) =>
          item.cartId === cartId ? { ...item, quantity } : item
        )
      );
    }
  };

  // Cập nhật ghi chú
  const updateNote = (cartId, note) => {
    setCart(
      cart.map((item) => (item.cartId === cartId ? { ...item, note } : item))
    );
  };

  // Cập nhật up size
  const updateUpsize = (cartId, isUpsize) => {
    setCart(
      cart.map((item) =>
        item.cartId === cartId ? { ...item, isUpsize } : item
      )
    );
  };

  // Cập nhật mức đường
  const updateSugarLevel = (cartId, sugarLevel) => {
    setCart(
      cart.map((item) =>
        item.cartId === cartId ? { ...item, sugarLevel } : item
      )
    );
  };

  // Cập nhật mức đá
  const updateIceLevel = (cartId, iceLevel) => {
    setCart(
      cart.map((item) =>
        item.cartId === cartId ? { ...item, iceLevel } : item
      )
    );
  };

  // Tính tổng tiền
  const total = cart.reduce((sum, item) => {
    let itemTotal = item.price * item.quantity;

    if (item.isUpsize) {
      itemTotal += 10000 * item.quantity;
    }

    const toppingTotal = item.toppings.reduce(
      (toppingSum, topping) => toppingSum + topping.price * topping.quantity,
      0
    );

    return sum + itemTotal + toppingTotal;
  }, 0);

  // Xử lý thay đổi phương thức thanh toán
  const handlePaymentMethodChange = (method) => {
    setPaymentMethods((prev) => {
      const newMethods = {
        ...prev,
        [method]: !prev[method],
      };

      // Nếu chỉ chọn 1 phương thức, tự động set số tiền = tổng đơn hàng
      const selectedMethods = Object.values(newMethods).filter(Boolean).length;
      if (selectedMethods === 1) {
        setPaymentAmounts({
          cash: newMethods.cash ? total : 0,
          transfer: newMethods.transfer ? total : 0,
        });
      } else if (selectedMethods === 0) {
        // Nếu không chọn gì, reset về 0
        setPaymentAmounts({ cash: 0, transfer: 0 });
      }

      return newMethods;
    });
  };

  // Xử lý thay đổi số tiền thanh toán
  const handlePaymentAmountChange = (method, amount) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: amount,
    }));
  };

  // Tính tổng tiền đã nhập
  const getTotalPaymentAmount = () => {
    return paymentAmounts.cash + paymentAmounts.transfer;
  };

  // Kiểm tra số tiền thanh toán có hợp lệ không
  const isPaymentAmountValid = () => {
    const totalPayment = getTotalPaymentAmount();
    const selectedMethods =
      Object.values(paymentMethods).filter(Boolean).length;

    // Nếu chỉ chọn 1 phương thức, số tiền phải = tổng đơn hàng
    if (selectedMethods === 1) {
      return totalPayment === total;
    }

    // Nếu chọn 2 phương thức, số tiền phải = tổng đơn hàng
    if (selectedMethods === 2) {
      return totalPayment === total;
    }

    return false;
  };

  // Tạo source_payment object từ payment methods và amounts
  const getSourcePayment = () => {
    const paymentData = {};

    if (paymentMethods.cash) {
      paymentData.cash = paymentAmounts.cash;
    }

    if (paymentMethods.transfer) {
      paymentData.transfer = paymentAmounts.transfer;
    }

    return paymentData;
  };

  // Xử lý thanh toán
  const handlePayment = async () => {
    if (cart.length === 0) {
      showNotification("Giỏ hàng trống!", "warning");
      return;
    }

    if (customerType === "table" && !tableNumber.trim()) {
      showNotification("Vui lòng nhập số bàn!", "warning");
      return;
    }

    // Kiểm tra ít nhất một phương thức thanh toán được chọn
    if (!paymentMethods.cash && !paymentMethods.transfer) {
      showNotification(
        "Vui lòng chọn ít nhất một phương thức thanh toán!",
        "warning"
      );
      return;
    }

    // Kiểm tra số tiền thanh toán
    if (!isPaymentAmountValid()) {
      showNotification(
        "Tổng số tiền thanh toán phải bằng tổng tiền đơn hàng!",
        "warning"
      );
      return;
    }

    try {
      setIsProcessing(true);

      const orderData = {
        tableNumber: customerType === "table" ? tableNumber : "Vãng lai",
        total: total,
        sourcePayment: getSourcePayment(), // Truyền object thay vì string
        paymentAmounts: paymentAmounts,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          isUpsize: item.isUpsize,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          note: item.note,
          toppings: item.toppings,
          customer_type: customerType,
        })),
      };

      console.log("Đang tạo đơn hàng:", orderData);

      // Gọi API tạo đơn hàng
      const newOrder = await createOrder(orderData);

      console.log("Đơn hàng đã được tạo:", newOrder);

      // Hiển thị thông báo thành công

      showNotification(
        `Đơn hàng đã được tạo thành công! Mã: ${newOrder.order_id.slice(-8)}`,
        "success",
        5000
      );

      // Reset form
      setCart([]);
      setTableNumber("");
      setCustomerType("table");
      setPaymentMethods({ cash: false, transfer: false });
      setPaymentAmounts({ cash: 0, transfer: 0 });
      setShowCart(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      showNotification(
        "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">☕</div>
          <p className="text-xl font-semibold text-gray-700">
            Đang tải menu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-orange-100">
      {/* Header với theme trà */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 shadow-2xl sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
              TIỆM TRÀ BỐN MÙA
            </h1>
            <p className="text-green-100 text-sm font-medium">
              {" "}
              Hệ thống đặt món
            </p>
          </div>
          {/* Giỏ hàng button - chỉ hiện trên mobile */}
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative bg-white/20 backdrop-blur-sm p-3 rounded-2xl hover:bg-white/30 transition-all duration-300 hover:scale-105 lg:hidden">
            <span className="text-2xl">🛒</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Layout chính - responsive */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Cột trái - Sản phẩm (Mobile: full width, Desktop: 2/3) */}
        <div className="flex-1 lg:w-2/3 flex flex-col h-screen">
          {/* Thông tin khách hàng với glassmorphism - Fixed */}
          <div className="bg-white/80 backdrop-blur-sm p-4 shadow-lg border-b border-white/20 flex-shrink-0">
            <div className="space-y-4">
              {/* Chọn loại khách hàng */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">👥</span>
                  Loại khách hàng
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCustomerType("table")}
                    className={`flex-1 p-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      customerType === "table"
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25"
                        : "bg-white/70 text-gray-700 hover:bg-white/90 shadow-md hover:shadow-lg"
                    }`}>
                    <span className="mr-2">🪑</span>
                    Khách ngồi bàn
                  </button>
                  <button
                    onClick={() => setCustomerType("walkin")}
                    className={`flex-1 p-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      customerType === "walkin"
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25"
                        : "bg-white/70 text-gray-700 hover:bg-white/90 shadow-md hover:shadow-lg"
                    }`}>
                    <span className="mr-2">🚶</span>
                    Khách vãng lai
                  </button>
                </div>
              </div>

              {/* Nhập số bàn (chỉ hiện khi chọn khách ngồi bàn) */}
              {customerType === "table" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🪑</span>
                    Số bàn
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 text-base font-medium transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    placeholder="Nhập số bàn (VD: 1, 2, A1, B2...)"
                  />
                </div>
              )}

              {/* Hiển thị thông tin khách vãng lai */}
              {customerType === "walkin" && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🚶</span>
                    <div>
                      <h3 className="font-bold text-blue-800">
                        Khách vãng lai
                      </h3>
                      <p className="text-sm text-blue-600">Đơn hàng mang đi</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter danh mục với gradient - Fixed */}
          <div className="bg-white/90 backdrop-blur-sm p-4 border-b border-white/20 flex-shrink-0">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {filterCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-300 hover:scale-105 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25"
                      : "bg-white/70 text-gray-700 hover:bg-white/90 shadow-md hover:shadow-lg"
                  }`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách sản phẩm với card đẹp - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`group bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-5 cursor-pointer hover:shadow-2xl transition-all duration-300 active:scale-95 hover:-translate-y-1 ${
                    toppings.find((t) => t.id === product.id)
                      ? "opacity-50 cursor-not-allowed"
                      : !product.isActive
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}>
                  {/* Background gradient cho icon */}
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                    {/* Hiển thị hình ảnh nếu có URL, nếu không thì hiển thị emoji */}
                    {product.image && product.image.startsWith("http") ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          // Nếu load ảnh lỗi, hiển thị emoji fallback
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                    ) : null}
                    <span
                      className={`text-3xl filter drop-shadow-lg ${
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

                  <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 text-center group-hover:text-green-600 transition-colors duration-300">
                    {product.name}
                  </h3>

                  <div className="text-center">
                    <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                      {product.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>

                  {/* Hiển thị trạng thái sản phẩm */}
                  {!product.isActive && (
                    <p className="text-xs text-red-500 text-center mt-2 font-medium">
                      Tạm ngừng bán
                    </p>
                  )}

                  {toppings.find((t) => t.id === product.id) && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      (Thêm vào món chính)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải - Giỏ hàng (Desktop: 1/3, Mobile: hidden) */}
        <div className="hidden lg:flex lg:w-1/3 bg-white/95 backdrop-blur-xl border-l border-white/20 flex-col h-screen">
          {/* Header giỏ hàng desktop - Fixed */}
          <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🛒 Giỏ hàng</h2>
                {customerType === "table" && tableNumber && (
                  <p className="text-sm text-green-600 font-medium">
                    Bàn {tableNumber}
                  </p>
                )}
                {customerType === "walkin" && (
                  <p className="text-sm text-blue-600 font-medium">
                    Khách vãng lai
                  </p>
                )}
              </div>
              {cart.length > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full px-3 py-1 font-bold">
                  {cart.length} món
                </span>
              )}
            </div>
          </div>

          {/* Danh sách món trong giỏ - Desktop - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-5xl mb-4 opacity-50">🛒</div>
                <p className="text-lg font-semibold mb-2">Giỏ hàng trống</p>
                <p className="text-sm">Chọn món để thêm vào giỏ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartId}
                    className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/20">
                    {/* Sản phẩm chính */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md overflow-hidden`}>
                          {item.image && item.image.startsWith("http") ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "block";
                              }}
                            />
                          ) : null}
                          <span
                            className={`text-sm ${
                              item.image && item.image.startsWith("http")
                                ? "hidden"
                                : "block"
                            }`}
                            style={{
                              display:
                                item.image && item.image.startsWith("http")
                                  ? "none"
                                  : "block",
                            }}>
                            {item.image && !item.image.startsWith("http")
                              ? item.image
                              : "☕"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-xs">
                            {item.name}
                            {item.isUpsize && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full ml-1">
                                UP
                              </span>
                            )}
                          </h4>
                          <p className="text-green-600 font-semibold text-xs">
                            {item.price.toLocaleString("vi-VN")}đ
                            {item.isUpsize && (
                              <span className="text-blue-600 ml-1">+10k</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateQuantity(item.cartId, item.quantity - 1)
                        }
                        className="text-red-500 hover:text-red-700 text-sm font-bold hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition-all duration-300">
                        ×
                      </button>
                    </div>

                    {/* Up Size Option - Compact */}
                    <div className="mb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isUpsize}
                          onChange={(e) =>
                            updateUpsize(item.cartId, e.target.checked)
                          }
                          className="w-3 h-3 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-1"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          🥤 Up Size (+10k)
                        </span>
                      </label>
                    </div>

                    {/* Options đường và đá - Compact */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          🍯 Đường
                        </label>
                        <select
                          value={item.sugarLevel}
                          onChange={(e) =>
                            updateSugarLevel(item.cartId, e.target.value)
                          }
                          className="w-full p-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent">
                          {sugarOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          🧊 Đá
                        </label>
                        <select
                          value={item.iceLevel}
                          onChange={(e) =>
                            updateIceLevel(item.cartId, e.target.value)
                          }
                          className="w-full p-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent">
                          {iceOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ghi chú - Compact */}
                    <div className="mb-2">
                      <input
                        type="text"
                        value={item.note}
                        onChange={(e) =>
                          updateNote(item.cartId, e.target.value)
                        }
                        placeholder="Ghi chú..."
                        className="w-full p-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    {/* Topping - Compact */}
                    {item.toppings.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Topping:
                        </p>
                        <div className="space-y-1">
                          {item.toppings.map((topping) => (
                            <div
                              key={topping.id}
                              className="flex items-center justify-between bg-gray-100 rounded p-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">{topping.image}</span>
                                <span className="text-xs font-medium">
                                  {topping.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() =>
                                    updateToppingQuantity(
                                      item.cartId,
                                      topping.id,
                                      topping.quantity - 1
                                    )
                                  }
                                  className="w-3 h-3 bg-white border border-gray-300 rounded-full flex items-center justify-center text-xs font-bold hover:bg-gray-50">
                                  -
                                </button>
                                <span className="font-bold text-xs min-w-[0.75rem] text-center">
                                  {topping.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateToppingQuantity(
                                      item.cartId,
                                      topping.id,
                                      topping.quantity + 1
                                    )
                                  }
                                  className="w-3 h-3 bg-white border border-gray-300 rounded-full flex items-center justify-center text-xs font-bold hover:bg-gray-50">
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nút thêm topping - Compact */}
                    <div className="mb-2">
                      <button
                        onClick={() => setEditingItem(item.cartId)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        + Thêm topping
                      </button>
                    </div>

                    {/* Modal chọn topping */}
                    {editingItem === item.cartId && (
                      <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">
                              Chọn topping cho {item.name}
                            </h3>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="text-gray-500 text-xl">
                              ✕
                            </button>
                          </div>
                          <div className="space-y-3">
                            {toppings.map((topping) => (
                              <button
                                key={topping.id}
                                onClick={() => {
                                  addToppingToItem(item.cartId, topping);
                                  setEditingItem(null);
                                }}
                                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">
                                    {topping.image}
                                  </span>
                                  <span className="font-medium">
                                    {topping.name}
                                  </span>
                                </div>
                                <span className="text-green-600 font-bold">
                                  +{topping.price.toLocaleString("vi-VN")}đ
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Số lượng và tổng tiền - Compact */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.cartId, item.quantity - 1)
                          }
                          className="w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                          -
                        </button>
                        <span className="font-bold text-xs min-w-[1.5rem] text-center bg-green-50 text-green-600 px-1 py-0.5 rounded">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartId, item.quantity + 1)
                          }
                          className="w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                          +
                        </button>
                      </div>
                      <span className="font-bold text-xs text-gray-900 bg-green-50 text-green-600 px-2 py-1 rounded">
                        {(
                          item.price * item.quantity +
                          (item.isUpsize ? 10000 * item.quantity : 0) +
                          item.toppings.reduce(
                            (sum, t) => sum + t.price * t.quantity,
                            0
                          )
                        ).toLocaleString("vi-VN")}
                        đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tổng tiền và thanh toán - Desktop - Fixed */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm flex-shrink-0 sticky bottom-0">
              <div className="flex justify-between items-center mb-3">
                <span className="text-base font-bold text-gray-900">
                  Tổng cộng:
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {total.toLocaleString("vi-VN")}đ
                </span>
              </div>

              {/* Phương thức thanh toán */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💳 Phương thức thanh toán
                </label>
                <div className="space-y-3">
                  {/* Tiền mặt */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentMethods.cash}
                        onChange={() => handlePaymentMethodChange("cash")}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        💵 Tiền mặt
                      </span>
                    </label>
                    {paymentMethods.cash && (
                      <div className="ml-7">
                        <input
                          type="number"
                          value={paymentAmounts.cash}
                          onChange={(e) =>
                            handlePaymentAmountChange(
                              "cash",
                              parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="Nhập số tiền"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="0"
                          max={total}
                        />
                      </div>
                    )}
                  </div>

                  {/* Chuyển khoản */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentMethods.transfer}
                        onChange={() => handlePaymentMethodChange("transfer")}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🏦 Chuyển khoản
                      </span>
                    </label>
                    {paymentMethods.transfer && (
                      <div className="ml-7">
                        <input
                          type="number"
                          value={paymentAmounts.transfer}
                          onChange={(e) =>
                            handlePaymentAmountChange(
                              "transfer",
                              parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="Nhập số tiền"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="0"
                          max={total}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Hiển thị tổng tiền đã nhập */}
                {(paymentMethods.cash || paymentMethods.transfer) && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Đã nhập:</span>
                      <span
                        className={`font-semibold ${
                          isPaymentAmountValid()
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                        {getTotalPaymentAmount().toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Còn thiếu:</span>
                      <span
                        className={`font-semibold ${
                          total - getTotalPaymentAmount() === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                        {(total - getTotalPaymentAmount()).toLocaleString(
                          "vi-VN"
                        )}
                        đ
                      </span>
                    </div>
                  </div>
                )}

                {paymentMethods.cash && paymentMethods.transfer && (
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Thanh toán hỗn hợp
                  </p>
                )}
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || !isPaymentAmountValid()}
                className={`w-full py-3 rounded-2xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isProcessing || !isPaymentAmountValid()
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 active:scale-95"
                }`}>
                {isProcessing ? "⏳ Đang xử lý..." : "LÊN ĐƠN"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart - Bottom Sheet (chỉ hiện trên mobile) */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300 lg:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-white/20">
            {/* Header giỏ hàng mobile */}
            <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🛒 Giỏ hàng</h2>
                {customerType === "table" && tableNumber && (
                  <p className="text-sm text-green-600 font-medium">
                    Bàn {tableNumber}
                  </p>
                )}
                {customerType === "walkin" && (
                  <p className="text-sm text-blue-600 font-medium">
                    Khách vãng lai
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300">
                ✕
              </button>
            </div>

            {/* Danh sách món trong giỏ - Mobile */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-8xl mb-6 opacity-50">🛒</div>
                  <p className="text-xl font-semibold mb-2">Giỏ hàng trống</p>
                  <p className="text-sm">Chọn món để thêm vào giỏ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.cartId}
                      className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/20">
                      {/* Sản phẩm chính */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md overflow-hidden`}>
                            {item.image && item.image.startsWith("http") ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-xl"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "block";
                                }}
                              />
                            ) : null}
                            <span
                              className={`text-xl ${
                                item.image && item.image.startsWith("http")
                                  ? "hidden"
                                  : "block"
                              }`}
                              style={{
                                display:
                                  item.image && item.image.startsWith("http")
                                    ? "none"
                                    : "block",
                              }}>
                              {item.image && !item.image.startsWith("http")
                                ? item.image
                                : "☕"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-base">
                              {item.name}
                              {item.isUpsize && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full ml-2">
                                  UP SIZE
                                </span>
                              )}
                            </h4>
                            <p className="text-green-600 font-semibold text-sm">
                              {item.price.toLocaleString("vi-VN")}đ
                              {item.isUpsize && (
                                <span className="text-blue-600 ml-1">+10k</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartId, item.quantity - 1)
                          }
                          className="text-red-500 hover:text-red-700 text-2xl font-bold hover:bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-300">
                          ×
                        </button>
                      </div>

                      {/* Up Size Option */}
                      <div className="mb-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isUpsize}
                            onChange={(e) =>
                              updateUpsize(item.cartId, e.target.checked)
                            }
                            className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            🥤 Up Size (+10.000đ)
                          </span>
                        </label>
                      </div>

                      {/* Options đường và đá */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Mức đường */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🍯 Mức đường
                          </label>
                          <select
                            value={item.sugarLevel}
                            onChange={(e) =>
                              updateSugarLevel(item.cartId, e.target.value)
                            }
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            {sugarOptions.map((option) => (
                              <option key={option.id} value={option.value}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mức đá */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🧊 Mức đá
                          </label>
                          <select
                            value={item.iceLevel}
                            onChange={(e) =>
                              updateIceLevel(item.cartId, e.target.value)
                            }
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            {iceOptions.map((option) => (
                              <option key={option.id} value={option.value}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Ghi chú */}
                      <div className="mb-4">
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) =>
                            updateNote(item.cartId, e.target.value)
                          }
                          placeholder="Ghi chú thêm (nếu có)..."
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      {/* Topping */}
                      {item.toppings.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            Topping:
                          </p>
                          <div className="space-y-2">
                            {item.toppings.map((topping) => (
                              <div
                                key={topping.id}
                                className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">
                                    {topping.image}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {topping.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({topping.price.toLocaleString("vi-VN")}đ)
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() =>
                                      updateToppingQuantity(
                                        item.cartId,
                                        topping.id,
                                        topping.quantity - 1
                                      )
                                    }
                                    className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-sm font-bold hover:bg-gray-50">
                                    -
                                  </button>
                                  <span className="font-bold text-sm min-w-[1.5rem] text-center">
                                    {topping.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateToppingQuantity(
                                        item.cartId,
                                        topping.id,
                                        topping.quantity + 1
                                      )
                                    }
                                    className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-sm font-bold hover:bg-gray-50">
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nút thêm topping */}
                      <div className="mb-4">
                        <button
                          onClick={() => setEditingItem(item.cartId)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          + Thêm topping
                        </button>
                      </div>

                      {/* Modal chọn topping */}
                      {editingItem === item.cartId && (
                        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
                          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg">
                                Chọn topping cho {item.name}
                              </h3>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="text-gray-500 text-xl">
                                ✕
                              </button>
                            </div>
                            <div className="space-y-3">
                              {toppings.map((topping) => (
                                <button
                                  key={topping.id}
                                  onClick={() => {
                                    addToppingToItem(item.cartId, topping);
                                    setEditingItem(null);
                                  }}
                                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xl">
                                      {topping.image}
                                    </span>
                                    <span className="font-medium">
                                      {topping.name}
                                    </span>
                                  </div>
                                  <span className="text-green-600 font-bold">
                                    +{topping.price.toLocaleString("vi-VN")}đ
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Số lượng và tổng tiền */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() =>
                              updateQuantity(item.cartId, item.quantity - 1)
                            }
                            className="w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                            -
                          </button>
                          <span className="font-bold text-xl min-w-[3rem] text-center bg-green-50 text-green-600 px-3 py-1 rounded-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.cartId, item.quantity + 1)
                            }
                            className="w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-md">
                            +
                          </button>
                        </div>
                        <span className="font-bold text-lg text-gray-900 bg-green-50 text-green-600 px-4 py-2 rounded-xl">
                          {(
                            item.price * item.quantity +
                            (item.isUpsize ? 10000 * item.quantity : 0) +
                            item.toppings.reduce(
                              (sum, t) => sum + t.price * t.quantity,
                              0
                            )
                          ).toLocaleString("vi-VN")}
                          đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tổng tiền và thanh toán - Mobile */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-200/50 bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-bold text-gray-900">
                    Tổng cộng:
                  </span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {total.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {/* Phương thức thanh toán - Mobile */}
                <div className="mb-6">
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    💳 Phương thức thanh toán
                  </label>
                  <div className="space-y-4">
                    {/* Tiền mặt */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentMethods.cash}
                          onChange={() => handlePaymentMethodChange("cash")}
                          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="text-base font-medium text-gray-700">
                          💵 Tiền mặt
                        </span>
                      </label>
                      {paymentMethods.cash && (
                        <div className="ml-9">
                          <input
                            type="number"
                            value={paymentAmounts.cash}
                            onChange={(e) =>
                              handlePaymentAmountChange(
                                "cash",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="Nhập số tiền"
                            className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="0"
                            max={total}
                          />
                        </div>
                      )}
                    </div>

                    {/* Chuyển khoản */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentMethods.transfer}
                          onChange={() => handlePaymentMethodChange("transfer")}
                          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="text-base font-medium text-gray-700">
                          🏦 Chuyển khoản
                        </span>
                      </label>
                      {paymentMethods.transfer && (
                        <div className="ml-9">
                          <input
                            type="number"
                            value={paymentAmounts.transfer}
                            onChange={(e) =>
                              handlePaymentAmountChange(
                                "transfer",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="Nhập số tiền"
                            className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="0"
                            max={total}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hiển thị tổng tiền đã nhập - Mobile */}
                  {(paymentMethods.cash || paymentMethods.transfer) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-base mb-1">
                        <span className="text-gray-600">Đã nhập:</span>
                        <span
                          className={`font-semibold ${
                            isPaymentAmountValid()
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                          {getTotalPaymentAmount().toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="text-gray-600">Còn thiếu:</span>
                        <span
                          className={`font-semibold ${
                            total - getTotalPaymentAmount() === 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                          {(total - getTotalPaymentAmount()).toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMethods.cash && paymentMethods.transfer && (
                    <p className="text-sm text-blue-600 mt-2">
                      💡 Thanh toán hỗn hợp
                    </p>
                  )}
                </div>

                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className={`w-full py-5 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg hover:shadow-xl ${
                    isProcessing
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 active:scale-95"
                  }`}>
                  {isProcessing ? "⏳ Đang xử lý..." : "LÊN ĐƠN"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button - chỉ hiện trên mobile */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-6 right-6 z-40 lg:hidden">
          <button
            onClick={() => setShowCart(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 transition-all duration-300 animate-bounce">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🛒</span>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {total.toLocaleString("vi-VN")}đ
                </div>
                <div className="text-xs opacity-90">{cart.length} món</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={hideNotification}
      />
    </div>
  );
}

export default Order;
