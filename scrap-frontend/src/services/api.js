/* src/services/api.js */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthToken = () => localStorage.getItem('authToken');

// Función para parsear errores específicos del API
const parseApiError = async (response) => {
    const status = response.status;

    try {
        const errorData = await response.json();
        console.log('📋 Datos de error del servidor:', errorData);

        // Usar directamente el mensaje del backend
        if (errorData.message) {
            return new Error(errorData.message);
        }

        // Mensajes por defecto según el código HTTP
        switch (status) {
            case 401:
                return new Error('No autorizado');
            case 403:
                return new Error('No tienes permisos para esta acción');
            case 404:
                return new Error('Recurso no encontrado');
            case 422:
                // Error de validación - username duplicado
                if (errorData.errors && errorData.errors.username) {
                    return new Error('El nombre de usuario ya está en uso. Por favor elige otro.');
                }
                return new Error('Error de validación en los datos');
            case 500:
                return new Error('Error interno del servidor');
            default:
                return new Error(`Error ${status}: ${response.statusText}`);
        }
    } catch (parseError) {
        console.warn('No se pudo parsear el cuerpo del error:', parseError);
        return new Error(`Error ${status}: ${response.statusText}`);
    }
};

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
            credentials: 'include',
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`📤 API Request: ${url}`, {
                method: config.method || 'GET',
                headers: config.headers,
                body: config.body ? JSON.parse(config.body) : undefined
            });

            const response = await fetch(url, config);

            console.log(`📥 API Response: ${url}`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Manejar errores HTTP
            if (!response.ok) {
                const apiError = await parseApiError(response);

                // Si es error 401, limpiar el token
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    console.log('🔐 Token removido por error 401');
                }

                throw apiError;
            }

            // Procesar respuesta exitosa
            const data = await response.json();
            console.log(`✅ API Success: ${url}`, data);
            return data;

        } catch (error) {
            console.error(`💥 Error en ${url}:`, error);

            // Si es un error de red (no HTTP)
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new Error('Error de conexión. Verifica tu internet o contacta al administrador');
                networkError.originalError = error;
                throw networkError;
            }

            // Re-lanzar el error ya parseado
            throw error;
        }
    },

    // ✅ MÉTODOS ESENCIALES SOLAMENTE
    async login(username, password) {
        try {
            console.log('🔐 Iniciando proceso de login...');
            const response = await this.request('/login', {
                method: 'POST',
                body: { username, password }
            });
            console.log('✅ Login exitoso en API');
            return response;
        } catch (error) {
            console.error('❌ Error en login API:', error);
            throw error;
        }
    },

    async logout() {
        try {
            await this.request('/logout', { method: 'POST' });
        } catch (error) {
            console.warn('⚠️ Error en logout (puede ser normal si el servidor no responde):', error);
        } finally {
            localStorage.removeItem('authToken');
            console.log('🔐 Token removido del localStorage');
        }
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
        console.log('📤 Enviando datos al backend:', data);
        try {
            const response = await this.request('/registros-scrap', {
                method: 'POST',
                body: data
            });
            console.log('✅ Respuesta del backend:', response);
            return response;
        } catch (error) {
            console.error('❌ Error en createRegistroScrap:', error);
            throw error;
        }
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