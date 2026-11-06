/**
 * HALDER Production API Client
 * Connects frontend UI to backend REST endpoints (/api/v1/...) with JWT auth and seamless error handling.
 */

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.origin
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:5000/api/v1');

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('halder-auth-token');
  }

  static setToken(token: string) {
    localStorage.setItem('halder-auth-token', token);
  }

  static clearToken() {
    localStorage.removeItem('halder-auth-token');
  }

  static async request<T = any>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      params?: Record<string, any>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    let url = `${BASE_URL}${endpoint}`;
    if (options.params) {
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      }
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.error?.message || `Request failed with status ${response.status}`);
    }

    return data.data !== undefined ? data.data : data;
  }

  // Auth APIs
  static sendOtp(phone: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: { phone },
    });
  }

  static verifyOtp(data: { phone: string; otp: string; role?: string; name?: string }) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: data,
    });
  }

  static login(emailOrPhone: string, password?: string, role?: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone, password, role },
    });
  }

  static register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  static async loginWithGoogle(idToken: string, role?: string) {
    const res = await this.request<any>('/auth/google', {
      method: 'POST',
      body: { idToken, role },
    });
    if (res?.token) {
      this.setToken(res.token);
    }
    return res;
  }

  static getMe() {
    return this.request('/auth/me');
  }

  // Products APIs
  static getProducts(params?: any) {
    return this.request('/products', { params });
  }

  static getProductById(id: string) {
    return this.request(`/products/${id}`);
  }

  static createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: data,
    });
  }

  static updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  static deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders APIs
  static getOrders(params?: any) {
    return this.request('/orders', { params });
  }

  static getOrderById(id: string) {
    return this.request(`/orders/${id}`);
  }

  static createOrder(data: any) {
    return this.request('/orders', {
      method: 'POST',
      body: data,
    });
  }

  static updateOrderStatus(id: string, status: string) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  // Cart APIs
  static getCart() {
    return this.request('/cart');
  }

  static addToCart(productId: string, quantity: number) {
    return this.request('/cart/items', {
      method: 'POST',
      body: { productId, quantity },
    });
  }

  static updateCartItem(productId: string, quantity: number) {
    return this.request('/cart/items', {
      method: 'PATCH',
      body: { productId, quantity },
    });
  }

  static removeCartItem(productId: string) {
    return this.request(`/cart/items/${productId}`, {
      method: 'DELETE',
    });
  }

  // Farmers APIs
  static getFarmers() {
    return this.request('/farmers');
  }

  static getFarmerProfile(id: string) {
    return this.request(`/farmers/${id}`);
  }

  // Admin APIs
  static getAdminKPIs() {
    return this.request('/admin/overview');
  }

  static getAdminUsers() {
    return this.request('/admin/users');
  }

  static toggleUserStatus(userId: string) {
    return this.request(`/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static verifyFarmer(farmerId: string, status: 'verified' | 'rejected') {
    return this.request(`/admin/farmers/${farmerId}/verify`, {
      method: 'PATCH',
      body: { status },
    });
  }

  static adminGetPendingKYC() {
    return this.request('/admin/kyc/pending');
  }

  static adminReviewKYC(farmerId: string, decision: 'verified' | 'rejected', reason?: string) {
    return this.request(`/admin/farmers/${farmerId}/kyc`, {
      method: 'PATCH',
      body: { decision, reason },
    });
  }

  static addCategory(name: string, emoji?: string, image?: string) {
    return this.request('/admin/categories', {
      method: 'POST',
      body: { name, emoji, image },
    });
  }

  static getKillSwitch() {
    return this.request('/admin/kill-switch');
  }

  static toggleKillSwitch(feature: string, enabled: boolean) {
    return this.request('/admin/kill-switch', {
      method: 'PATCH',
      body: { feature, enabled },
    });
  }

  static getAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  // Notifications APIs
  static getNotifications() {
    return this.request('/notifications');
  }

  static markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  static markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  static registerDeviceToken(token: string, platform: 'web' | 'android' | 'ios' = 'web', deviceName?: string) {
    return this.request('/notifications/device-token', {
      method: 'POST',
      body: { token, platform, deviceName },
    });
  }

  static sendTestPush(title?: string, message?: string) {
    return this.request('/notifications/test-push', {
      method: 'POST',
      body: { title, message },
    });
  }

  // Payments & Payouts APIs
  // PhonePe Payment Gateway APIs
  static initiatePhonePePayment(data: {
    amount: number;
    orderId?: string;
    customerMobile?: string;
    redirectUrl?: string;
  }) {
    return this.request('/payments/phonepe/initiate', {
      method: 'POST',
      body: data,
    });
  }

  static getPhonePeStatus(merchantTransactionId: string) {
    return this.request(`/payments/phonepe/status/${merchantTransactionId}`);
  }

  // Paytm Payment Gateway APIs
  static initiatePaytmPayment(data: {
    amount: number;
    orderId?: string;
    customerMobile?: string;
  }) {
    return this.request('/payments/paytm/initiate', {
      method: 'POST',
      body: data,
    });
  }

  static getPaytmStatus(orderId: string) {
    return this.request(`/payments/paytm/status/${orderId}`);
  }

  // Google Pay APIs
  static initiateGPayPayment(data: {
    amount: number;
    orderId?: string;
    customerMobile?: string;
    customerName?: string;
    farmerUpiId?: string;
    farmerName?: string;
  }) {
    return this.request('/payments/gpay/initiate', {
      method: 'POST',
      body: data,
    });
  }

  static verifyGPayPayment(data: { orderId: string; txnRef?: string }) {
    return this.request('/payments/gpay/verify', {
      method: 'POST',
      body: data,
    });
  }

  static getFarmerPayouts(farmerId?: string) {
    return this.request('/payments/payouts', {
      params: farmerId ? { farmerId } : undefined,
    });
  }

  static getFarmerEarnings(farmerId: string) {
    return this.request(`/farmers/${farmerId}/earnings`);
  }

  static updateFarmerPayoutSettings(farmerId: string, data: {
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    upiId?: string;
  }) {
    return this.request(`/farmers/${farmerId}/payout-settings`, {
      method: 'PUT',
      body: data,
    });
  }

  static requestFarmerWithdrawal(farmerId: string, data: {
    amount: number;
    method?: 'upi' | 'bank_transfer';
    note?: string;
  }) {
    return this.request(`/farmers/${farmerId}/withdraw`, {
      method: 'POST',
      body: data,
    });
  }

  static submitFarmerKYC(farmerId: string, data: {
    documentType: string;
    documentNumber: string;
    documentUrl: string;
  }) {
    return this.request(`/farmers/${farmerId}/kyc`, {
      method: 'POST',
      body: data,
    });
  }

  static getFarmerKYC(farmerId: string) {
    return this.request(`/farmers/${farmerId}/kyc`);
  }

  static requestPayout(amount: number, upiOrBank: string) {
    return this.request('/payments/request-payout', {
      method: 'POST',
      body: { amount, upiOrBank },
    });
  }

  // Reviews APIs
  static createReview(data: { orderId: string; rating: number; review: string }) {
    return this.request('/reviews', {
      method: 'POST',
      body: data,
    });
  }

  static getFarmerReviews(farmerId: string) {
    return this.request(`/reviews/farmer/${farmerId}`);
  }

  // Chat APIs
  static getConversations() {
    return this.request('/chat/conversations');
  }

  static createConversation(farmerId: string, productId?: string) {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: { farmerId, productId },
    });
  }

  static getMessages(conversationId: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`);
  }

  static sendChatMessage(conversationId: string, message: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { message },
    });
  }

  static markConversationRead(conversationId: string) {
    return this.request(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
    });
  }

  // File Upload API
  static async uploadImages(files: File[]): Promise<{ urls: string[]; primaryUrl: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/upload/images`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error?.message || 'Image upload failed');
    }

    return data.data;
  }

  // Agro-Weather & Advisory API (AI App Security Checklist - Point 1 & 7)
  static async getAgroWeather(city: string = 'Dehradun'): Promise<any> {
    const res = await this.request<any>('/weather/agro', {
      params: { city },
    });
    return res.data;
  }

  // Favorites API
  static async getFavorites(): Promise<any[]> {
    const res = await this.request<any>('/favorites');
    return res.data || [];
  }

  static async addFavorite(productId: string): Promise<any> {
    const res = await this.request<any>(`/favorites/${productId}`, {
      method: 'POST',
    });
    return res.data;
  }

  static async removeFavorite(productId: string): Promise<any> {
    const res = await this.request<any>(`/favorites/${productId}`, {
      method: 'DELETE',
    });
    return res.data;
  }

  // Reports & Support Grievances API
  static async submitReport(data: {
    orderId?: string;
    productId?: string;
    reportedUserId?: string;
    category?: string;
    priority?: string;
    reason: string;
    description?: string;
    evidenceUrl?: string;
  }): Promise<any> {
    const res = await this.request<any>('/reports', {
      method: 'POST',
      body: data,
    });
    return res.data;
  }

  static async getMyReports(): Promise<any[]> {
    const res = await this.request<any>('/reports/my');
    return res.data;
  }

  static async getAdminReports(params?: { status?: string; category?: string; priority?: string }): Promise<any[]> {
    const res = await this.request<any>('/reports', {
      params,
    });
    return res.data;
  }

  static async updateReportStatus(
    id: string,
    updates: {
      status?: string;
      resolutionNotes?: string;
      resolutionReason?: string;
      assignedAdminId?: string;
    }
  ): Promise<any> {
    const res = await this.request<any>(`/reports/${id}/status`, {
      method: 'PATCH',
      body: updates,
    });
    return res.data;
  }

  // ==========================================
  // CUSTOMER PROFILE & ADDRESS MANAGEMENT API
  // ==========================================

  static async getCustomerProfile(): Promise<any> {
    const res = await this.request<any>('/customers/me');
    return res.data;
  }

  static async updateCustomerProfile(data: {
    name?: string;
    phone?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
  }): Promise<any> {
    const res = await this.request<any>('/customers/me', {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  }

  static async uploadCustomerAvatar(avatar: string): Promise<any> {
    const res = await this.request<any>('/customers/me/avatar', {
      method: 'POST',
      body: { avatar },
    });
    return res.data;
  }

  static async removeCustomerAvatar(): Promise<any> {
    const res = await this.request<any>('/customers/me/avatar', {
      method: 'DELETE',
    });
    return res.data;
  }

  static async getCustomerAddresses(): Promise<any[]> {
    const res = await this.request<any>('/customers/me/addresses');
    return res.data || [];
  }

  static async createCustomerAddress(data: {
    label?: string;
    name: string;
    phone: string;
    houseBuilding: string;
    streetLocality: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
    isDefault?: boolean;
    latitude?: number;
    longitude?: number;
  }): Promise<any> {
    const res = await this.request<any>('/customers/me/addresses', {
      method: 'POST',
      body: data,
    });
    return res.data;
  }

  static async updateCustomerAddress(
    addressId: string,
    data: Partial<{
      label: string;
      name: string;
      phone: string;
      houseBuilding: string;
      streetLocality: string;
      city: string;
      state: string;
      postalCode: string;
      landmark: string;
      isDefault: boolean;
      latitude: number;
      longitude: number;
    }>
  ): Promise<any> {
    const res = await this.request<any>(`/customers/me/addresses/${addressId}`, {
      method: 'PUT',
      body: data,
    });
    return res.data;
  }

  static async deleteCustomerAddress(addressId: string): Promise<any> {
    const res = await this.request<any>(`/customers/me/addresses/${addressId}`, {
      method: 'DELETE',
    });
    return res.data;
  }

  static async setDefaultCustomerAddress(addressId: string): Promise<any> {
    const res = await this.request<any>(`/customers/me/addresses/${addressId}/default`, {
      method: 'PATCH',
    });
    return res.data;
  }

  static async getCustomerSettings(): Promise<any> {
    const res = await this.request<any>('/customers/me/settings');
    return res.data;
  }

  static async updateCustomerSettings(settings: Record<string, boolean>): Promise<any> {
    const res = await this.request<any>('/customers/me/settings', {
      method: 'PATCH',
      body: settings,
    });
    return res.data;
  }

  // ==========================================
  // AUTH & SECURITY CREDENTIALS API
  // ==========================================

  static async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    const res = await this.request<any>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    return res.data;
  }

  static async deleteAccount(password?: string): Promise<any> {
    const res = await this.request<any>('/auth/delete-account', {
      method: 'POST',
      body: { password },
    });
    this.clearToken();
    return res.data;
  }

  static async logout(): Promise<any> {
    try {
      await this.request<any>('/auth/logout', { method: 'POST' });
    } catch {}
    this.clearToken();
    return { success: true };
  }

  // ==========================================
  // FARMER PROFILE MANAGEMENT API
  // ==========================================

  static async getFarmerPrivateProfile(): Promise<any> {
    const res = await this.request<any>('/farmers/me/profile');
    return res.data;
  }

  static async getFarmerPublicProfile(farmerProfileId: string): Promise<any> {
    const res = await this.request<any>(`/farmers/${farmerProfileId}/public`);
    return res.data;
  }

  static async updateFarmerProfile(data: {
    farmName?: string;
    description?: string;
    location?: string;
    city?: string;
    specialtyCrops?: string[];
    farmSizeAcres?: number;
    waterSource?: string;
    experienceYears?: number;
  }): Promise<any> {
    const res = await this.request<any>('/farmers/me/profile', {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  }

  static async uploadFarmerAvatar(avatar: string): Promise<any> {
    const res = await this.request<any>('/farmers/me/avatar', {
      method: 'POST',
      body: { avatar },
    });
    return res.data;
  }

  // ==========================================
  // MODULE 2: FARM CROPS & BUSINESS INSIGHTS
  // ==========================================
  static async getFarmerCrops(farmerId: string): Promise<any[]> {
    return this.request<any[]>(`/farmers/${farmerId}/crops`);
  }

  static async addFarmerCrop(farmerId: string, cropData: any): Promise<any> {
    return this.request<any>(`/farmers/${farmerId}/crops`, {
      method: 'POST',
      body: cropData,
    });
  }

  static async updateFarmerCrop(cropId: string, cropData: any): Promise<any> {
    return this.request<any>(`/farmers/crops/${cropId}`, {
      method: 'PATCH',
      body: cropData,
    });
  }

  static async deleteFarmerCrop(cropId: string): Promise<any> {
    return this.request<any>(`/farmers/crops/${cropId}`, {
      method: 'DELETE',
    });
  }

  static async getFarmerBusinessInsights(farmerId: string): Promise<any> {
    return this.request<any>(`/farmers/${farmerId}/business-insights`);
  }

  // ==========================================
  // MODULE 4: MANDI INTELLIGENCE
  // ==========================================
  static async getMandiPrices(params?: { crop?: string; state?: string; district?: string }): Promise<any[]> {
    return this.request<any[]>('/mandi/prices', { params });
  }

  static exportMandiCsvUrl(): string {
    return `${BASE_URL}/mandi/export`;
  }

  static async getMandiAnalytics(): Promise<any> {
    return this.request<any>('/mandi/analytics');
  }

  static async getCropDemandIndicators(): Promise<any[]> {
    return this.request<any[]>('/mandi/demand');
  }

  static async estimateFarmerProfit(params: { crop: string; yieldKg: number; platformPrice: number }): Promise<any> {
    return this.request<any>('/mandi/estimate', { params });
  }

  static async createMandiPrice(data: any): Promise<any> {
    return this.request<any>('/mandi/prices', {
      method: 'POST',
      body: data,
    });
  }

  // ==========================================
  // MODULE 5: LOGISTICS ENGINE
  // ==========================================
  static async getDeliveryPartners(): Promise<any[]> {
    return this.request<any[]>('/logistics/partners');
  }

  static async getDeliveryTasks(params?: { status?: string; partner_id?: string }): Promise<any[]> {
    return this.request<any[]>('/logistics/tasks', { params });
  }

  static async getDeliveryTaskForOrder(orderId: string): Promise<any> {
    return this.request<any>(`/logistics/tasks/order/${orderId}`);
  }

  static async verifyDeliveryOtp(taskId: string, otp: string, notes?: string): Promise<any> {
    return this.request<any>(`/logistics/tasks/${taskId}/verify-otp`, {
      method: 'POST',
      body: { otp, notes },
    });
  }

  static async updateDeliveryTaskStatus(taskId: string, status: string, notes?: string): Promise<any> {
    return this.request<any>(`/logistics/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status, notes },
    });
  }

  static async assignDeliveryTask(data: { order_id: string; delivery_partner_id: string; pickup_notes?: string }): Promise<any> {
    return this.request<any>('/logistics/tasks/assign', {
      method: 'POST',
      body: data,
    });
  }

  // ==========================================
  // MODULE 6: FINANCIAL ENGINE & SETTLEMENTS
  // ==========================================
  static async getFinancialDashboard(): Promise<any> {
    return this.request<any>('/finance/dashboard');
  }

  static async getFarmerEarningsBreakdown(farmerId: string): Promise<any> {
    return this.request<any>(`/finance/farmer-earnings/${farmerId}`);
  }

  static async requestWithdrawal(farmerId: string, amount: number, payoutMethod?: string, payoutAddress?: string): Promise<any> {
    return this.request<any>('/finance/withdraw', {
      method: 'POST',
      body: { farmerId, amount, payoutMethod, payoutAddress },
    });
  }

  static async getFinancialTransactions(params?: { limit?: number; type?: string }): Promise<any[]> {
    return this.request<any[]>('/finance/transactions', { params });
  }

  static async getFinancialSettings(): Promise<any> {
    return this.request<any>('/finance/settings');
  }

  static async updateFinancialSettings(settings: Record<string, string | number>): Promise<any> {
    return this.request<any>('/finance/settings', {
      method: 'PATCH',
      body: settings,
    });
  }

  static exportFinancialCsvUrl(): string {
    return `${BASE_URL}/finance/export`;
  }

  // ==========================================
  // MODULE 8: ADVANCED MARKETPLACE
  // ==========================================
  static async getB2BProfile(userId: string): Promise<any> {
    return this.request<any>(`/advanced/b2b/profile/${userId}`);
  }

  static async registerB2BProfile(data: { company_name: string; gstin?: string; business_type: string; contact_person: string; email: string; phone: string; address: string }): Promise<any> {
    return this.request<any>('/advanced/b2b/profile', {
      method: 'POST',
      body: data,
    });
  }

  static async getWholesaleQuotations(params?: { farmer_id?: string; user_id?: string }): Promise<any[]> {
    return this.request<any[]>('/advanced/b2b/quotations', { params });
  }

  static async createWholesaleQuotation(data: { product_id: string; farmer_id: string; quantity: number; requested_price_per_unit: number; notes?: string }): Promise<any> {
    return this.request<any>('/advanced/b2b/quotations', {
      method: 'POST',
      body: data,
    });
  }

  static async updateWholesaleQuotationStatus(id: string, data: { status: string; farmer_counter_price?: number; notes?: string }): Promise<any> {
    return this.request<any>(`/advanced/b2b/quotations/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  static async getGroupBuys(): Promise<any[]> {
    return this.request<any[]>('/advanced/group-buys');
  }

  static async getMyGroupBuys(): Promise<any[]> {
    return this.request<any[]>('/advanced/group-buys/my');
  }

  static async createGroupBuy(data: {
    product_id: string;
    title: string;
    target_quantity: number;
    discounted_price: number;
    min_buyers_count?: number;
    duration_hours?: number;
  }): Promise<any> {
    return this.request<any>('/advanced/group-buys', {
      method: 'POST',
      body: data,
    });
  }

  static async joinGroupBuy(id: string, quantity: number): Promise<any> {
    return this.request<any>(`/advanced/group-buys/${id}/join`, {
      method: 'POST',
      body: { quantity },
    });
  }

  static async leaveGroupBuy(id: string): Promise<any> {
    return this.request<any>(`/advanced/group-buys/${id}/leave`, {
      method: 'POST',
    });
  }

  static async getScheduledProcurements(): Promise<any[]> {
    return this.request<any[]>('/advanced/procurements');
  }

  static async createScheduledProcurement(data: { product_id: string; quantity: number; unit?: string; frequency: string; delivery_time_slot?: string; delivery_address: string }): Promise<any> {
    return this.request<any>('/advanced/procurements', {
      method: 'POST',
      body: data,
    });
  }

  static async updateScheduledProcurement(id: string, data: { quantity?: number; frequency?: string; delivery_time_slot?: string; delivery_address?: string }): Promise<any> {
    return this.request<any>(`/advanced/procurements/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async updateScheduledProcurementStatus(id: string, status: string): Promise<any> {
    return this.request<any>(`/advanced/procurements/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  static async skipScheduledProcurement(id: string): Promise<any> {
    return this.request<any>(`/advanced/procurements/${id}/skip`, {
      method: 'POST',
    });
  }

  static async executeScheduledProcurement(id: string): Promise<any> {
    return this.request<any>(`/advanced/procurements/${id}/execute`, {
      method: 'POST',
    });
  }

  static async getFarmerSubscription(farmerId: string): Promise<any> {
    return this.request<any>(`/advanced/subscriptions/${farmerId}`);
  }

  static async upgradeFarmerSubscription(farmerId: string, planId: string): Promise<any> {
    return this.request<any>('/advanced/subscriptions', {
      method: 'POST',
      body: { farmerId, planId },
    });
  }
}


