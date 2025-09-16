import React, { useState, useEffect, useRef } from "react";
import {
  getAllOrders,
  subscribeToOrders,
  unsubscribeFromOrders,
} from "../../services/orderService";
import {
  getAllProducts,
  subscribeToProducts,
  unsubscribeFromProducts,
  subscribeToCategories,
  unsubscribeFromCategories,
} from "../../services/productService";
import { getAllCategories } from "../../services/categoryService";
import BottomNavbar from "../../component/BottomNavbar";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    todayOrders: 0,
    totalRevenue: 0,
    cashRevenue: 0,
    transferRevenue: 0,
    averageOrderValue: 0,
    cancelledOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [dateFilter, setDateFilter] = useState("7days"); // 7days, 30days, 90days, all, custom
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [advancedMetrics, setAdvancedMetrics] = useState({
    conversionRate: 0,
    averageOrderTime: 0,
    peakHour: "",
    bestSellingCategory: "",
    customerRetention: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const orderSubscriptionRef = useRef(null);
  const productSubscriptionRef = useRef(null);
  const categorySubscriptionRef = useRef(null);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time order updates
    const orderSubscription = subscribeToOrders((payload) => {
      console.log("Dashboard - Order update received:", payload);

      if (payload.eventType === "INSERT") {
        // New order added - reload dashboard data
        loadDashboardData();
      } else if (payload.eventType === "UPDATE") {
        // Order updated (e.g., cancelled) - reload dashboard data
        loadDashboardData();
      } else if (payload.eventType === "DELETE") {
        // Order deleted - reload dashboard data
        loadDashboardData();
      }
    });

    // Subscribe to real-time product updates
    const productSubscription = subscribeToProducts((payload) => {
      console.log("Dashboard - Product update received:", payload);
      // Reload dashboard data when products change
      loadDashboardData();
    });

    // Subscribe to real-time category updates
    const categorySubscription = subscribeToCategories((payload) => {
      console.log("Dashboard - Category update received:", payload);
      // Reload dashboard data when categories change
      loadDashboardData();
    });

    orderSubscriptionRef.current = orderSubscription;
    productSubscriptionRef.current = productSubscription;
    categorySubscriptionRef.current = categorySubscription;

    // Cleanup subscriptions on unmount
    return () => {
      if (orderSubscriptionRef.current) {
        unsubscribeFromOrders(orderSubscriptionRef.current);
      }
      if (productSubscriptionRef.current) {
        unsubscribeFromProducts(productSubscriptionRef.current);
      }
      if (categorySubscriptionRef.current) {
        unsubscribeFromCategories(categorySubscriptionRef.current);
      }
    };
  }, [dateFilter, customDateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [orders, products, categories] = await Promise.all([
        getAllOrders(),
        getAllProducts(),
        getAllCategories(),
      ]);

      // Filter orders by date and exclude cancelled orders
      const activeOrders = orders.filter((order) => !order.isCancelled);
      const filteredOrders = filterOrdersByDate(activeOrders, dateFilter);

      console.log("📊 Dashboard summary:", {
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        filteredOrders: filteredOrders.length,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      });

      // Tính toán thống kê cơ bản
      const today = new Date().toDateString();
      const todayOrders = activeOrders.filter(
        (order) => new Date(order.created_at).toDateString() === today
      );

      // Tính "Đơn hôm nay" dựa trên filter hiện tại
      const todayOrdersInFilter = filteredOrders.filter(
        (order) => new Date(order.created_at).toDateString() === today
      );

      const cancelledOrders = orders.filter((order) => order.isCancelled);
      const totalRevenue = filteredOrders.reduce(
        (sum, order) => sum + order.total_price,
        0
      );
      const averageOrderValue =
        filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

      // Tính toán doanh thu theo phương thức thanh toán
      let cashRevenue = 0;
      let transferRevenue = 0;

      filteredOrders.forEach((order) => {
        if (order.sourcePayment) {
          if (order.sourcePayment.cash) {
            cashRevenue += order.sourcePayment.cash;
          }
          if (order.sourcePayment.transfer) {
            transferRevenue += order.sourcePayment.transfer;
          }
        }
      });

      setStats({
        totalOrders: filteredOrders.length,
        totalProducts: products.length,
        totalCategories: categories.length,
        todayOrders:
          dateFilter === "all"
            ? todayOrders.length
            : todayOrdersInFilter.length,
        totalRevenue: totalRevenue,
        cashRevenue: cashRevenue,
        transferRevenue: transferRevenue,
        averageOrderValue: averageOrderValue,
        cancelledOrders: cancelledOrders.length,
      });

      // Tạo dữ liệu cho biểu đồ
      generateChartData(filteredOrders);

      // Tạo thống kê sản phẩm
      generateProductStats(filteredOrders);

      // Tạo thống kê thanh toán
      generatePaymentStats(filteredOrders);

      // Tạo dữ liệu phân tích nâng cao
      generateHourlyData(filteredOrders);
      generateWeeklyTrends(filteredOrders);
      generateMonthlyComparison(filteredOrders);
      generateAdvancedMetrics(filteredOrders, products, categories);

      // Lấy 5 đơn hàng gần nhất (không bao gồm đơn bị hủy)
      setRecentOrders(activeOrders.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByDate = (orders, filter) => {
    const now = new Date();
    const filterDate = new Date();

    switch (filter) {
      case "7days":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        filterDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        filterDate.setDate(now.getDate() - 90);
        break;
      case "custom":
        if (customDateRange.startDate && customDateRange.endDate) {
          console.log("🔍 Custom filter debug:", {
            startDate: customDateRange.startDate,
            endDate: customDateRange.endDate,
            totalOrders: orders.length,
          });

          // Tạo Date objects cho start và end date
          const startDate = new Date(customDateRange.startDate + "T00:00:00");
          const endDate = new Date(customDateRange.endDate + "T23:59:59");

          const filtered = orders.filter((order) => {
            const orderDate = new Date(order.created_at);

            const isInRange = orderDate >= startDate && orderDate <= endDate;

            console.log("📅 Order check:", {
              orderId: order.order_id,
              created_at: order.created_at,
              orderDate: orderDate.toISOString(),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              isInRange: isInRange,
              isCancelled: order.isCancelled,
            });

            return isInRange;
          });

          console.log("✅ Filtered result:", filtered.length, "orders");
          return filtered;
        } else {
          console.log("⚠️ No custom date range selected");
          return orders;
        }
      default:
        return orders;
    }

    return orders.filter((order) => new Date(order.created_at) >= filterDate);
  };

  const generateChartData = (orders) => {
    const days = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at).toDateString();
      if (!days[date]) {
        days[date] = {
          date: new Date(order.created_at).toLocaleDateString("vi-VN", {
            month: "short",
            day: "numeric",
          }),
          revenue: 0,
          orders: 0,
        };
      }
      days[date].revenue += order.total_price;
      days[date].orders += 1;
    });

    const chartData = Object.values(days).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    setChartData(chartData);
  };

  const generateProductStats = (orders) => {
    const productSales = {};

    orders.forEach((order) => {
      if (order.items) {
        order.items.forEach((item) => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[item.product_id].quantity += item.quantity;
          productSales[item.product_id].revenue += item.price * item.quantity;
        });
      }
    });

    const productStats = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setProductStats(productStats);
  };

  const generatePaymentStats = (orders) => {
    let totalCashRevenue = 0;
    let totalTransferRevenue = 0;

    orders.forEach((order) => {
      if (order.sourcePayment) {
        // Tính tổng tiền mặt nhận được
        if (order.sourcePayment.cash > 0) {
          totalCashRevenue += order.sourcePayment.cash;
        }
        // Tính tổng chuyển khoản nhận được
        if (order.sourcePayment.transfer > 0) {
          totalTransferRevenue += order.sourcePayment.transfer;
        }
      }
    });

    setPaymentStats([
      { name: "Tiền mặt", value: totalCashRevenue, color: "#10B981" },
      { name: "Chuyển khoản", value: totalTransferRevenue, color: "#3B82F6" },
    ]);
  };

  const generateHourlyData = (orders) => {
    const hourlyStats = {};

    // Khởi tạo tất cả giờ từ 0-23
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = {
        hour: i,
        orders: 0,
        revenue: 0,
        label: `${i}:00`,
      };
    }

    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourlyStats[hour].orders += 1;
      hourlyStats[hour].revenue += order.total_price;
    });

    const hourlyData = Object.values(hourlyStats);
    setHourlyData(hourlyData);
  };

  const generateWeeklyTrends = (orders) => {
    const weeklyStats = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Chủ nhật
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyStats[weekKey]) {
        weeklyStats[weekKey] = {
          week: weekKey,
          orders: 0,
          revenue: 0,
          label: `Tuần ${Math.ceil(date.getDate() / 7)}`,
        };
      }

      weeklyStats[weekKey].orders += 1;
      weeklyStats[weekKey].revenue += order.total_price;
    });

    const weeklyData = Object.values(weeklyStats).sort(
      (a, b) => new Date(a.week) - new Date(b.week)
    );
    setWeeklyTrends(weeklyData);
  };

  const generateMonthlyComparison = (orders) => {
    const monthlyStats = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          orders: 0,
          revenue: 0,
          label: `${date.getMonth() + 1}/${date.getFullYear()}`,
        };
      }

      monthlyStats[monthKey].orders += 1;
      monthlyStats[monthKey].revenue += order.total_price;
    });

    const monthlyData = Object.values(monthlyStats).sort(
      (a, b) => new Date(a.month) - new Date(b.month)
    );
    setMonthlyComparison(monthlyData);
  };

  const generateAdvancedMetrics = (orders, products, categories) => {
    if (orders.length === 0) {
      setAdvancedMetrics({
        conversionRate: 0,
        averageOrderTime: 0,
        peakHour: "",
        bestSellingCategory: "",
        customerRetention: 0,
      });
      return;
    }

    // Tính conversion rate (giả sử có 100 visitors, 10 orders = 10%)
    const conversionRate = Math.min((orders.length / 100) * 100, 100);

    // Tính average order time (giả sử trung bình 15 phút)
    const averageOrderTime = 15;

    // Tìm peak hour
    const hourlyCounts = {};
    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });
    const peakHour = Object.keys(hourlyCounts).reduce((a, b) =>
      hourlyCounts[a] > hourlyCounts[b] ? a : b
    );

    // Tìm best selling category
    const categorySales = {};
    orders.forEach((order) => {
      if (order.items) {
        order.items.forEach((item) => {
          // Tìm category từ product
          const product = products.find(
            (p) => p.product_id === item.product_id
          );
          if (product) {
            const category = categories.find(
              (c) => c.category_id === product.category_id
            );
            if (category) {
              categorySales[category.category_name] =
                (categorySales[category.category_name] || 0) + item.quantity;
            }
          }
        });
      }
    });
    const bestSellingCategory = Object.keys(categorySales).reduce(
      (a, b) => (categorySales[a] > categorySales[b] ? a : b),
      "Chưa có dữ liệu"
    );

    // Customer retention (giả sử 85%)
    const customerRetention = 85;

    setAdvancedMetrics({
      conversionRate,
      averageOrderTime,
      peakHour: `${peakHour}:00`,
      bestSellingCategory,
      customerRetention,
    });
  };

  const handleCustomDateApply = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setDateFilter("custom");
      setShowCustomDatePicker(false);
    }
  };

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    if (filter !== "custom") {
      setShowCustomDatePicker(false);
    } else {
      setShowCustomDatePicker(true);
    }
  };

  const getDateRangeDisplay = () => {
    if (
      dateFilter === "custom" &&
      customDateRange.startDate &&
      customDateRange.endDate
    ) {
      const start = new Date(customDateRange.startDate).toLocaleDateString(
        "vi-VN"
      );
      const end = new Date(customDateRange.endDate).toLocaleDateString("vi-VN");
      return `${start} - ${end}`;
    }
    return null;
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const closeOrderDetail = () => {
    setShowOrderDetail(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl font-semibold text-gray-700">
            Đang tải dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
              <p className="text-white/80 text-sm">
                Tổng quan hệ thống quản lý
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Date Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Báo cáo tổng quan
                </h2>
                {getDateRangeDisplay() && (
                  <p className="text-sm text-gray-500 mt-1">
                    Khoảng thời gian: {getDateRangeDisplay()}
                  </p>
                )}
              </div>
            </div>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer min-w-[180px]">
                <option value="7days">📅 7 ngày qua</option>
                <option value="30days">📅 30 ngày qua</option>
                <option value="90days">📅 90 ngày qua</option>
                <option value="all">📅 Tất cả</option>
                <option value="custom">📅 Tùy chọn</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    📅 Từ ngày
                  </label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) =>
                      setCustomDateRange({
                        ...customDateRange,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    📅 Đến ngày
                  </label>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) =>
                      setCustomDateRange({
                        ...customDateRange,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomDateApply}
                    disabled={
                      !customDateRange.startDate || !customDateRange.endDate
                    }
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300">
                    ✅ Áp dụng
                  </button>
                  <button
                    onClick={() => setShowCustomDatePicker(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all duration-300">
                    ❌ Hủy
                  </button>
                </div>
              </div>
              {(!customDateRange.startDate || !customDateRange.endDate) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600 text-sm">⚠️</span>
                    <p className="text-xs text-yellow-700">
                      Vui lòng chọn cả ngày bắt đầu và ngày kết thúc
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* No Data Warning */}
        {stats.totalOrders === 0 && dateFilter !== "all" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Không có dữ liệu
                </h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <p>
                    Không có đơn hàng nào trong khoảng thời gian đã chọn. Hãy
                    thử chọn khoảng thời gian khác hoặc kiểm tra lại dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Tổng đơn hàng
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  {dateFilter === "all" ? "Đơn hôm nay" : "Đơn trong filter"}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.todayOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Sản phẩm
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Danh mục
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCategories}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🏷️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Tổng doanh thu
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalRevenue.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Tiền mặt
                </p>
                <p className="text-xl font-bold text-green-600">
                  {stats.cashRevenue.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Chuyển khoản
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {stats.transferRevenue.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🏦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Giá trị TB/đơn
                </p>
                <p className="text-xl font-bold text-purple-600">
                  {stats.averageOrderValue.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Đơn đã hủy
                </p>
                <p className="text-xl font-bold text-red-600">
                  {stats.cancelledOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">❌</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📈</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Doanh thu theo thời gian
              </h3>
            </div>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-4xl mb-3 opacity-50">📊</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Không có dữ liệu
                  </p>
                  <p className="text-sm text-gray-400">
                    Không có đơn hàng nào trong khoảng thời gian này
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value.toLocaleString("vi-VN")}đ`,
                      name === "revenue" ? "Doanh thu" : "Số đơn",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment Method Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Phương thức thanh toán
              </h3>
            </div>
            {paymentStats.every((stat) => stat.value === 0) ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-4xl mb-3 opacity-50">💳</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Không có dữ liệu
                  </p>
                  <p className="text-sm text-gray-400">
                    Không có đơn hàng nào trong khoảng thời gian này
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value">
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value.toLocaleString("vi-VN")}đ`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Product Performance */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏆</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Top sản phẩm bán chạy
            </h3>
          </div>
          {productStats.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3 opacity-50">📦</div>
              <p className="text-lg font-semibold text-gray-500 mb-1">
                Chưa có dữ liệu sản phẩm
              </p>
              <p className="text-sm text-gray-400">
                Dữ liệu sẽ hiển thị khi có đơn hàng
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {productStats.slice(0, 5).map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {product.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.quantity} sản phẩm đã bán
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {product.revenue.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-xs text-gray-500">Doanh thu</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Hourly Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">⏰</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Doanh thu theo giờ
              </h3>
            </div>
            {hourlyData.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-4xl mb-3 opacity-50">⏰</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Không có dữ liệu
                  </p>
                  <p className="text-sm text-gray-400">
                    Không có đơn hàng nào trong khoảng thời gian này
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={2} />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value.toLocaleString("vi-VN")}đ`,
                      name === "revenue" ? "Doanh thu" : "Số đơn",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Weekly Trends Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Xu hướng theo tuần
              </h3>
            </div>
            {weeklyTrends.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-4xl mb-3 opacity-50">📅</div>
                  <p className="text-lg font-semibold text-gray-500 mb-1">
                    Không có dữ liệu
                  </p>
                  <p className="text-sm text-gray-400">
                    Không có đơn hàng nào trong khoảng thời gian này
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value.toLocaleString("vi-VN")}đ`,
                      name === "revenue" ? "Doanh thu" : "Số đơn",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Tỷ lệ chuyển đổi
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {advancedMetrics.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Thời gian TB/đơn
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {advancedMetrics.averageOrderTime} phút
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">⏱️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Giờ cao điểm
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {advancedMetrics.peakHour}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🔥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Danh mục bán chạy
                </p>
                <p className="text-lg font-bold text-purple-600">
                  {advancedMetrics.bestSellingCategory}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🏆</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              So sánh doanh thu theo tháng
            </h3>
          </div>
          {monthlyComparison.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-50">📊</div>
                <p className="text-lg font-semibold text-gray-500 mb-1">
                  Không có dữ liệu
                </p>
                <p className="text-sm text-gray-400">
                  Không có đơn hàng nào trong khoảng thời gian này
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    `${value.toLocaleString("vi-VN")}đ`,
                    name === "revenue" ? "Doanh thu" : "Số đơn",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Đơn hàng gần đây
            </h2>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-lg font-semibold text-gray-500 mb-1">
                Chưa có đơn hàng nào
              </p>
              <p className="text-sm text-gray-400">
                Các đơn hàng mới sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.order_id}
                  onClick={() => handleOrderClick(order)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📋</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        #{order.order_id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.table_number} •{" "}
                        {new Date(order.created_at).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {order.total_price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.items?.length || 0} món
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Chi tiết đơn hàng</h2>
                  <p className="text-blue-100 text-sm">
                    #{selectedOrder.order_id.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={closeOrderDetail}
                  className="text-white hover:text-gray-200 transition-colors">
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Bàn</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.table_number}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Thời gian</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Payment Info */}
              {selectedOrder.sourcePayment && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    💳 Thông tin thanh toán
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.sourcePayment.cash > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Tiền mặt</p>
                        <p className="font-bold text-green-600">
                          {selectedOrder.sourcePayment.cash.toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </p>
                      </div>
                    )}
                    {selectedOrder.sourcePayment.transfer > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Chuyển khoản</p>
                        <p className="font-bold text-blue-600">
                          {selectedOrder.sourcePayment.transfer.toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  📋 Danh sách món
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {item.product_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Số lượng: {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-green-600">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}
                          đ
                        </p>
                      </div>

                      {/* Customizations */}
                      <div className="space-y-1">
                        {item.isUpsize && (
                          <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            ⬆️ Size lớn
                          </p>
                        )}
                        {item.sugarLevel && (
                          <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            🍯 {item.sugarLevel}% đường
                          </p>
                        )}
                        {item.iceLevel && (
                          <p className="text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                            🧊 {item.iceLevel}% đá
                          </p>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            🍒 Topping: {item.toppings.join(", ")}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            📝 Ghi chú: {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Tổng cộng:</span>
                  <span className="text-2xl font-bold">
                    {selectedOrder.total_price.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}

export default AdminDashboard;
