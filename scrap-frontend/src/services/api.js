// src/services/api.js
const API_BASE_URL = 'http://localhost:8000/api';

const getAuthToken = () => {
    try {
        return localStorage.getItem('authToken');
    } catch (error) {
        console.error('Error obteniendo token:', error);
        return null;
    }
};

const isAuthenticated = () => {
    return !!getAuthToken();
};

export const apiClient = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAuthToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
            ...options,
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                console.warn('🔐 Sesión expirada/No autenticado - Forzando logout.');
                localStorage.removeItem('authToken');
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }

            if (!response.ok && response.status !== 403 && response.status !== 422) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();
            
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                if (response.ok) {
                    return responseText; 
                }
                console.warn('❌ Respuesta no es JSON válido:', responseText.substring(0, 100));
                throw new Error(`Respuesta del servidor no es válida: ${response.status}`);
            }

            if (!response.ok) {
                const errorMessage = data.message || 
                                     data.error || 
                                     `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return data;

        } catch (error) {
            console.error(`💥 Error en petición ${url}:`, error);
            if (error.message.includes('Failed to fetch')) {
                 throw new Error('Error de conexión. Verifique que el servidor esté ejecutándose.');
            }
            throw error;
        }
    },

    // ========== AUTENTICACIÓN ==========
    async login(username, password) {
        return this.request('/login', {
            method: 'POST',
            body: { username, password },
        });
    },

    async logout() {
        try {
            await this.request('/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Error durante logout:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    },

    async getUser() {
        return this.request('/user');
    },

    // ========== BÁSCULA (Abre/Cierra en cada llamada) ==========
    async listarPuertosBascula() {
        return this.request('/bascula/puertos').catch(error => {
             // Fallback
             return {
                success: true,
                puertos: ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9'],
                sistema: 'windows',
                puerto_recomendado: 'COM3',
                mensaje: 'Usando puertos simulados por error de conexión: ' + error.message,
                error: error.message
            };
        });
    },

    // Envía puerto, baudios y timeout al backend para que este abra/lea/cierre
    async conectarBascula(data = {}) {
        return this.request('/bascula/conectar', {
            method: 'POST',
            body: data,
        });
    },
    
    // Envía puerto, baudios y timeout al backend para que este abra/lea/cierre
    async leerPesoBascula(data = {}) {
        return this.request('/bascula/leer-peso', {
            method: 'POST',
            body: data,
        });
    },

    async configurarBascula(config) {
        return this.request('/bascula/configurar', {
            method: 'POST',
            body: config,
        });
    },
    
    // ========== REGISTROS SCRAP ==========
    async getRegistrosScrap(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/registros-scrap?${queryParams}`);
    },

    async getRegistrosConfig() {
        return this.request('/registros-scrap/configuracion');
    },
    
    async createRegistroScrap(registroData) {
        return this.request('/registros-scrap', {
            method: 'POST',
            body: registroData,
        });
    },

    async getRegistroScrapStats() {
        return this.request('/registros-scrap/stats');
    },

    async getReportesAcumulados(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/registros-scrap/reportes/acumulados?${queryParams}`);
    },
    
    // ========== USUARIOS ==========
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
    
    // ========== DASHBOARD ==========
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    },

    async getRecentActivity() {
        return this.request('/dashboard/recent-activity');
    },

    async getAdminStats() {
        return this.request('/dashboard/admin-stats');
    },
    
    // ========== RECEPCIONES SCRAP ==========
    async getRegistrosPendientes() {
        return this.request('/recepciones-scrap/registros-pendientes');
    },

    async createRecepcionScrap(data) {
        return this.request('/recepciones-scrap', { method: 'POST', body: data });
    },
    
    async getRecepcionesScrap(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/recepciones-scrap?${queryParams}`);
    },

    async getRecepcionScrapStats() {
        return this.request('/recepciones-scrap/stats');
    },

    async getStockDisponible() {
        return this.request('/recepciones-scrap/stock/disponible');
    },

    async getReporteRecepcion(params) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/recepciones-scrap/reportes/recepcion?${queryParams}`);
    },
    
    // ========== UTILIDADES ==========
    async downloadPDF(endpoint, data = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAuthToken();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error descargando PDF:', error);
            throw error;
        }
    },

};

export { isAuthenticated, getAuthToken };