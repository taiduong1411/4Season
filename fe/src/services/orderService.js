import supabase from "../utils/supabase";

// Tạo đơn hàng mới
export const createOrder = async (orderData) => {
  try {
    console.log("Creating order:", orderData);

    const { data: order, error } = await supabase
      .from("order")
      .insert([
        {
          table_number: orderData.tableNumber,
          total_price: orderData.total,
          items: orderData.items, // Lưu toàn bộ items dưới dạng JSON
          sourcePayment: orderData.sourcePayment, // Lưu thông tin thanh toán
          isCancelled: false,
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

// Cập nhật trạng thái hủy đơn hàng
export const cancelOrder = async (orderId) => {
  try {
    const { data: order, error } = await supabase
      .from("order")
      .update({ isCancelled: true })
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelling order:", error);
      throw error;
    }

    return order;
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    throw error;
  }
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
