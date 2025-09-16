import React, { useState } from "react";
import BottomNavbar from "../../component/BottomNavbar";

function AdminSettings() {
  const [settings, setSettings] = useState({
    storeName: "Tiệm Trà Bốn Mùa",
    storeAddress: "123 Đường ABC, Quận 1, TP.HCM",
    storePhone: "0123 456 789",
    storeEmail: "info@tramtra4mua.com",
    taxRate: 10,
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
  });

  const [notifications, setNotifications] = useState({
    newOrder: true,
    lowStock: true,
    dailyReport: true,
    weeklyReport: false,
  });

  const handleSaveSettings = () => {
    // TODO: Implement save settings to backend
    alert("Đã lưu cài đặt thành công!");
  };

  const handleSaveNotifications = () => {
    // TODO: Implement save notification settings to backend
    alert("Đã lưu cài đặt thông báo thành công!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">⚙️ Cài đặt</h1>
          <p className="text-blue-100 text-sm">Quản lý cài đặt hệ thống</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Store Settings */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🏪 Thông tin cửa hàng
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên cửa hàng
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) =>
                  setSettings({ ...settings, storeName: e.target.value })
                }
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Nhập tên cửa hàng"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                value={settings.storeAddress}
                onChange={(e) =>
                  setSettings({ ...settings, storeAddress: e.target.value })
                }
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Nhập địa chỉ cửa hàng"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={settings.storePhone}
                  onChange={(e) =>
                    setSettings({ ...settings, storePhone: e.target.value })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, storeEmail: e.target.value })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thuế VAT (%)
                </label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      taxRate: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiền tệ
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="VND">VND (Việt Nam Đồng)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Múi giờ
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                  <option value="Asia/Bangkok">Asia/Bangkok</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg">
              💾 Lưu cài đặt cửa hàng
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🔔 Cài đặt thông báo
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Thông báo đơn hàng mới
                </p>
                <p className="text-xs text-gray-500">
                  Nhận thông báo khi có đơn hàng mới
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.newOrder}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      newOrder: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Cảnh báo hết hàng
                </p>
                <p className="text-xs text-gray-500">
                  Thông báo khi sản phẩm sắp hết hàng
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.lowStock}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      lowStock: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Báo cáo hàng ngày
                </p>
                <p className="text-xs text-gray-500">
                  Nhận báo cáo doanh thu hàng ngày
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.dailyReport}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      dailyReport: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Báo cáo hàng tuần
                </p>
                <p className="text-xs text-gray-500">
                  Nhận báo cáo tổng kết hàng tuần
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weeklyReport}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      weeklyReport: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <button
              onClick={handleSaveNotifications}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg">
              🔔 Lưu cài đặt thông báo
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            ℹ️ Thông tin hệ thống
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Phiên bản:</span>
                <span className="text-sm font-semibold text-gray-900">
                  v1.0.0
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cập nhật cuối:</span>
                <span className="text-sm font-semibold text-gray-900">
                  Hôm nay
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <span className="text-sm font-semibold text-green-600">
                  Hoạt động bình thường
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Database:</span>
                <span className="text-sm font-semibold text-gray-900">
                  Supabase
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Framework:</span>
                <span className="text-sm font-semibold text-gray-900">
                  React + Vite
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">UI Library:</span>
                <span className="text-sm font-semibold text-gray-900">
                  Tailwind CSS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}

export default AdminSettings;
