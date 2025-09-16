import supabase from "../utils/supabase";

// Tạo đơn hàng mới
export const createOrder = async (orderData) => {
  try {
    console.log("Creating order:", orderData);

    const now = new Date().toISOString();
    const timeline = [
      {
        status: "pending",
        timestamp: now,
        description: "Đơn hàng đã được tạo",
        actor: "staff",
      },
    ];

    const { data: order, error } = await supabase
      .from("order")
      .insert([
        {
          table_number: orderData.tableNumber,
          total_price: orderData.total,
          items: orderData.items, // Lưu toàn bộ items dưới dạng JSON
          sourcePayment: orderData.sourcePayment, // Lưu thông tin thanh toán
          isCancelled: false,
          status: "pending", // pending, preparing, completed, cancelled
          time_line: timeline,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      throw error;
    }

    console.log("Order created successfully:", order);
    return order;
  } catch (error) {
    console.error("Error in createOrder:", error);
    throw error;
  }
};

// Lấy tất cả đơn hàng
export const getAllOrders = async () => {
  try {
    const { data: orders, error } = await supabase
      .from("order")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }

    return orders || [];
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    return [];
  }
};

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (
  orderId,
  newStatus,
  actor = "kitchen"
) => {
  try {
    // Lấy đơn hàng hiện tại để cập nhật timeline
    const { data: currentOrder, error: fetchError } = await supabase
      .from("order")
      .select("time_line")
      .eq("order_id", orderId)
      .single();

    if (fetchError) {
      console.error("Error fetching current order:", fetchError);
      throw fetchError;
    }

    const now = new Date().toISOString();
    const statusDescriptions = {
      pending: "Đơn hàng đã được tạo",
      preparing: "Nhà bếp đang chuẩn bị",
      completed: "Đơn hàng đã hoàn thành",
      cancelled: "Đơn hàng đã bị hủy",
    };

    const newTimelineEntry = {
      status: newStatus,
      timestamp: now,
      description: statusDescriptions[newStatus] || `Trạng thái: ${newStatus}`,
      actor: actor,
    };

    const updatedTimeline = [
      ...(currentOrder.time_line || []),
      newTimelineEntry,
    ];

    const updateData = {
      status: newStatus,
      time_line: updatedTimeline,
    };

    // Nếu là cancelled, cập nhật isCancelled
    if (newStatus === "cancelled") {
      updateData.isCancelled = true;
    }

    const { data: order, error } = await supabase
      .from("order")
      .update(updateData)
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error updating order status:", error);
      throw error;
    }

    return order;
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    throw error;
  }
};

// Cập nhật trạng thái hủy đơn hàng (backward compatibility)
export const cancelOrder = async (orderId) => {
  return updateOrderStatus(orderId, "cancelled", "staff");
};

// Nhà bếp bắt đầu chuẩn bị đơn hàng
export const startPreparingOrder = async (orderId) => {
  return updateOrderStatus(orderId, "preparing", "kitchen");
};

// Nhà bếp hoàn thành đơn hàng
export const completeOrder = async (orderId) => {
  return updateOrderStatus(orderId, "completed", "kitchen");
};

// Lấy đơn hàng theo ID
export const getOrderById = async (orderId) => {
  try {
    const { data: order, error } = await supabase
      .from("order")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      throw error;
    }

    return order;
  } catch (error) {
    console.error("Error in getOrderById:", error);
    return null;
  }
};

// Subscribe to real-time order updates
export const subscribeToOrders = (callback) => {
  const subscription = supabase
    .channel("orders_changes")
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
        schema: "public",
        table: "order",
      },
      (payload) => {
        console.log("Order change received:", payload);
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

// Unsubscribe from real-time updates
export const unsubscribeFromOrders = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};
