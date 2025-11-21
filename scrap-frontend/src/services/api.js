/* src/services/api.js - VERSIÓN LIMPIA */
const API_BASE_URL = 'http://localhost:8000/api';

const getAuthToken = () => localStorage.getItem('authToken');

export const apiClient = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAuthToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error en ${url}:`, error);
            throw error;
        }
    },

    // ✅ MÉTODOS ESENCIALES SOLAMENTE
    async login(username, password) {
        return this.request('/login', { method: 'POST', body: { username, password } });
    },

    async logout() {
        await this.request('/logout', { method: 'POST' });
        localStorage.removeItem('authToken');
    },

    async getUser() {
        return this.request('/user');
    },

    // Báscula
    async listarPuertosBascula() {
        return this.request('/bascula/puertos');
    },

    async conectarBascula(data) {
        return this.request('/bascula/conectar', { method: 'POST', body: data });
    },

    async leerPesoBascula(data) {
        return this.request('/bascula/leer-peso', { method: 'POST', body: data });
    },

    async desconectarBascula(data) {
        return this.request('/bascula/desconectar', { method: 'POST', body: data });
    },

    // Registros
    async getRegistrosScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/registros-scrap?${query}`);
    },

    async getRegistrosConfig() {
        return this.request('/registros-scrap/configuracion');
    },

    async createRegistroScrap(data) {
        return this.request('/registros-scrap', { method: 'POST', body: data });
    },

    async getRegistroScrapStats() {
        return this.request('/registros-scrap/stats');
    },

    // Recepciones
    async getRegistrosPendientes() {
        return this.request('/recepciones-scrap/registros-pendientes');
    },

    async createRecepcionScrap(data) {
        return this.request('/recepciones-scrap', { method: 'POST', body: data });
    },

    async getRecepcionesScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/recepciones-scrap?${query}`);
    },

    async getRecepcionScrapStats() {
        return this.request('/recepciones-scrap/stats');
    },

    async getStockDisponible() {
        return this.request('/recepciones-scrap/stock/disponible');
    },

    // Usuarios (solo admin)
    async getUsers() {
        return this.request('/users');
    },

    async createUser(data) {
        return this.request('/users', { method: 'POST', body: data });
    },

    async updateUser(id, data) {
        return this.request(`/users/${id}`, { method: 'PUT', body: data });
    },

    async deleteUser(id) {
        return this.request(`/users/${id}`, { method: 'DELETE' });
    },

    async toggleUserStatus(id) {
        return this.request(`/users/${id}/toggle-status`, { method: 'PATCH' });
    },

    // Dashboard
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    },

    async getRecentActivity() {
        return this.request('/dashboard/recent-activity');
    },

    async getAdminStats() {
        return this.request('/dashboard/admin-stats');
    }
};