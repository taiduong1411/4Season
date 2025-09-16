import React, { useState, useEffect, useRef } from "react";
import {
  getAllOrders,
  cancelOrder,
  startPreparingOrder,
  completeOrder,
  subscribeToOrders,
  unsubscribeFromOrders,
} from "../../services/orderService";
import BottomNavbar from "../../component/BottomNavbar";
import { useNotification } from "../../hooks/useNotification";
import NotificationToast from "../../components/NotificationToast";
import useNotificationSound from "../../hooks/useNotificationSound";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, today, cancelled
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const subscriptionRef = useRef(null);

  // Notification system
  const { notification, showNotification, hideNotification } =
    useNotification();

  // Sound notification system
  const { playNotificationSound, initializeAudioContext } =
    useNotificationSound();

  // Initialize AudioContext on component mount
  useEffect(() => {
    console.log(
      "🔊 AdminOrders - Component mounted, setting up AudioContext initialization"
    );

    const handleFirstInteraction = () => {
      console.log(
        "🔊 First user interaction detected, initializing AudioContext"
      );
      initializeAudioContext();
      // Remove event listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    // Add event listeners for various user interactions
    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    // Cleanup
    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [initializeAudioContext]);

  useEffect(() => {
    loadOrders();

    // Subscribe to real-time updates
    const subscription = subscribeToOrders((payload) => {
      console.log("Orders page - Real-time update received:", payload);

      if (payload.eventType === "INSERT") {
        // New order added
        console.log("🔊 AdminOrders - New order detected, playing sound...");
        setOrders((prevOrders) => [payload.new, ...prevOrders]);

        // Play sound notification for new order
        playNotificationSound();
      } else if (payload.eventType === "UPDATE") {
        // Order updated (e.g., cancelled)
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.order_id === payload.new.order_id ? payload.new : order
          )
        );
      } else if (payload.eventType === "DELETE") {
        // Order deleted
        setOrders((prevOrders) =>
          prevOrders.filter((order) => order.order_id !== payload.old.order_id)
        );
      }
    });

    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromOrders(subscriptionRef.current);
      }
    };
  }, [playNotificationSound]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await getAllOrders();
      console.log("Orders loaded:", ordersData);
      console.log("First order timeline:", ordersData[0]?.time_line);
      setOrders(ordersData);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    try {
      await cancelOrder(orderId);
      showNotification("Đã hủy đơn hàng thành công!", "success");
      loadOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      showNotification("Có lỗi xảy ra khi hủy đơn hàng!", "error");
    }
  };

  const handleStartPreparing = async (orderId) => {
    try {
      await startPreparingOrder(orderId);
      showNotification("Đã bắt đầu chuẩn bị đơn hàng!", "success");
      loadOrders();
    } catch (error) {
      console.error("Error starting preparation:", error);
      showNotification("Có lỗi xảy ra khi bắt đầu chuẩn bị!", "error");
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeOrder(orderId);
      showNotification("Đã hoàn thành đơn hàng!", "success");
      loadOrders();
    } catch (error) {
      console.error("Error completing order:", error);
      showNotification("Có lỗi xảy ra khi hoàn thành đơn hàng!", "error");
    }
  };

  const handleOrderClick = (order) => {
    console.log("Order clicked:", order);
    console.log("Timeline:", order.time_line);
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const closeOrderDetail = () => {
    setShowOrderDetail(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders.filter((order) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.created_at).toDateString();

    switch (filter) {
      case "pending":
        return order.status === "pending";
      case "preparing":
        return order.status === "preparing";
      case "completed":
        return order.status === "completed";
      case "incomplete":
        return (
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          !order.isCancelled
        );
      case "cancelled":
        return order.status === "cancelled" || order.isCancelled;
      case "today":
        return orderDate === today;
      default:
        return true;
    }
  });

  const formatPaymentMethod = (sourcePayment) => {
    if (!sourcePayment) return "Chưa xác định";

    const methods = [];
    if (sourcePayment.cash)
      methods.push(`Tiền mặt: ${sourcePayment.cash.toLocaleString("vi-VN")}đ`);
    if (sourcePayment.transfer)
      methods.push(
        `Chuyển khoản: ${sourcePayment.transfer.toLocaleString("vi-VN")}đ`
      );

    return methods.join(" + ") || "Chưa xác định";
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        text: "Chờ xử lý",
        color: "bg-yellow-100 text-yellow-800",
        icon: "⏳",
      },
      preparing: {
        text: "Đang chuẩn bị",
        color: "bg-blue-100 text-blue-800",
        icon: "👨‍🍳",
      },
      completed: {
        text: "Hoàn thành",
        color: "bg-green-100 text-green-800",
        icon: "✅",
      },
      cancelled: {
        text: "Đã hủy",
        color: "bg-red-100 text-red-800",
        icon: "❌",
      },
    };

    return (
      statusMap[status] || {
        text: status || "Chưa xác định",
        color: "bg-gray-100 text-gray-800",
        icon: "❓",
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-xl font-semibold text-gray-700">
            Đang tải đơn hàng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20"
      onClick={() => {
        // Initialize AudioContext on any click
        initializeAudioContext();
      }}>
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 shadow-lg cursor-pointer"
        onClick={() => {
          console.log("🔊 Header clicked - initializing AudioContext");
          initializeAudioContext();
        }}
        title="Click để khởi tạo âm thanh thông báo">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">📋 Quản lý đơn hàng</h1>
          <p className="text-blue-100 text-sm">Theo dõi và quản lý đơn hàng</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
              }`}
              title={`Tất cả (${orders.length})`}>
              📋
            </button>
            <button
              onClick={() => setFilter("today")}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === "today"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
              }`}
              title={`Hôm nay (${
                orders.filter(
                  (o) =>
                    new Date(o.created_at).toDateString() ===
                    new Date().toDateString()
                ).length
              })`}>
              📅
            </button>
            <button
              onClick={() => setFilter("incomplete")}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === "incomplete"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
              }`}
              title={`Chưa hoàn thành (${
                orders.filter(
                  (o) =>
                    o.status !== "completed" &&
                    o.status !== "cancelled" &&
                    !o.isCancelled
                ).length
              })`}>
              🔄
            </button>
            <button
              onClick={() => setFilter("cancelled")}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === "cancelled"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
              }`}
              title={`Đã hủy (${
                orders.filter((o) => o.status === "cancelled" || o.isCancelled)
                  .length
              })`}>
              ❌
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-lg font-semibold text-gray-500 mb-1">
                Không có đơn hàng nào
              </p>
              <p className="text-sm text-gray-400">
                {filter === "today"
                  ? "Chưa có đơn hàng nào hôm nay"
                  : filter === "cancelled"
                  ? "Chưa có đơn hàng nào bị hủy"
                  : "Chưa có đơn hàng nào trong hệ thống"}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.order_id}
                onClick={() => handleOrderClick(order)}
                className={`bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 border-l-4 cursor-pointer ${
                  order.status === "cancelled"
                    ? "border-red-500 bg-red-50/30"
                    : order.status === "completed"
                    ? "border-green-500 bg-green-50/30"
                    : order.status === "preparing"
                    ? "border-blue-500 bg-blue-50/30"
                    : "border-yellow-500 bg-yellow-50/30"
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                      <span className="text-lg">
                        {getStatusInfo(order.status).icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        #{order.order_id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.table_number} •{" "}
                        {new Date(order.created_at).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        • {order.items?.length || 0} món
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {order.total_price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.sourcePayment?.cash
                        ? "💵"
                        : order.sourcePayment?.transfer
                        ? "🏦"
                        : "❓"}
                    </p>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusInfo(order.status).color
                      }`}>
                      {getStatusInfo(order.status).text}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Action Buttons */}
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPreparing(order.order_id);
                          }}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                          Bắt đầu
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrder(order.order_id);
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
                          Hủy
                        </button>
                      </>
                    )}

                    {order.status === "preparing" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteOrder(order.order_id);
                        }}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors">
                        Hoàn thành
                      </button>
                    )}

                    {order.status === "completed" && (
                      <span className="text-xs text-green-600 font-medium">
                        Đã hoàn thành
                      </span>
                    )}

                    {order.status === "cancelled" && (
                      <span className="text-xs text-red-600 font-medium">
                        Đã hủy
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-white/20">
                    <span className="text-xl text-white">
                      {getStatusInfo(selectedOrder.status).icon}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      Đơn hàng #{selectedOrder.order_id.slice(-8)}
                    </h2>
                    <p className="text-blue-100">
                      {selectedOrder.table_number} •{" "}
                      {new Date(selectedOrder.created_at).toLocaleString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOrderDetail}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors duration-300">
                  <span className="text-white text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Order Status */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <span className="mr-2">📊</span>
                    Trạng thái đơn hàng
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getStatusInfo(selectedOrder.status).color
                    }`}>
                    {getStatusInfo(selectedOrder.status).text}
                  </span>
                </div>

                {/* Timeline */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">⏰</span>
                    Timeline
                  </h4>
                  {selectedOrder.time_line &&
                  selectedOrder.time_line.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.time_line.map((entry, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              entry.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : entry.status === "preparing"
                                ? "bg-blue-100 text-blue-800"
                                : entry.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                            {getStatusInfo(entry.status).icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {entry.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString(
                                "vi-VN"
                              )}{" "}
                              •
                              {entry.actor === "staff"
                                ? " 👨‍💼 Nhân viên"
                                : " 👨‍🍳 Nhà bếp"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        Chưa có timeline cho đơn hàng này
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Timeline sẽ được tạo khi đơn hàng được cập nhật
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🍽️</span>
                  Chi tiết món ăn
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {item.product_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Số lượng: {item.quantity} • Giá:{" "}
                            {item.price.toLocaleString("vi-VN")}đ/món
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}
                          đ
                        </p>
                      </div>

                      {/* Item Details */}
                      <div className="space-y-1 text-sm text-gray-600">
                        {item.isUpsize && (
                          <p className="flex items-center">
                            <span className="mr-2">📏</span>
                            Up size
                          </p>
                        )}
                        {item.sugarLevel && (
                          <p className="flex items-center">
                            <span className="mr-2">🍯</span>
                            Đường: {item.sugarLevel}
                          </p>
                        )}
                        {item.iceLevel && (
                          <p className="flex items-center">
                            <span className="mr-2">🧊</span>
                            Đá: {item.iceLevel}
                          </p>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <p className="flex items-center">
                            <span className="mr-2">🍒</span>
                            Topping: {item.toppings.join(", ")}
                          </p>
                        )}
                        {item.note && (
                          <p className="flex items-center">
                            <span className="mr-2">📝</span>
                            Ghi chú: {item.note}
                          </p>
                        )}
                        {item.customer_type && (
                          <p className="flex items-center">
                            <span className="mr-2">👤</span>
                            Loại khách: {item.customer_type}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">💳</span>
                  Thông tin thanh toán
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Phương thức thanh toán:
                      </span>
                      <span className="font-medium">
                        {formatPaymentMethod(selectedOrder.sourcePayment)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng tiền:</span>
                      <span className="text-green-600">
                        {selectedOrder.total_price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              {!selectedOrder.isCancelled && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      closeOrderDetail();
                      handleCancelOrder(selectedOrder.order_id);
                    }}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl">
                    Hủy đơn hàng
                  </button>
                </div>
              )}
            </div>
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

export default AdminOrders;
