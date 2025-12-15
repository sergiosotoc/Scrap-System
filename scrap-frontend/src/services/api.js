/* src/services/api.js */

// Lógica inteligente para determinar la URL base
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000/api'; 
  }
  return `http://${window.location.hostname}:8000/api`;
};

const API_BASE_URL = getBaseUrl();

const getAuthToken = () => localStorage.getItem('authToken');

const parseApiError = async (response) => {
    const status = response.status;
    try {
        const errorData = await response.json();
        
        // Caso especial para errores de validación (422) de Laravel
        if (status === 422 && errorData.errors) {
            // Laravel devuelve { errors: { field: ["msg1", "msg2"] } }
            // Convertimos eso en un solo texto legible
            const mensajes = Object.values(errorData.errors).flat().join('. ');
            return new Error(mensajes || 'Datos inválidos. Verifique el formulario.');
        }

        if (errorData.message) return new Error(errorData.message);
        
        switch (status) {
            case 401: return new Error('No autorizado. Sesión expirada.');
            case 403: return new Error('No tienes permisos para esta acción.');
            case 404: return new Error('Recurso no encontrado.');
            case 500: return new Error('Error interno del servidor. Contacte a soporte.');
            default: return new Error(`Error ${status}: ${response.statusText}`);
        }
    } catch (parseError) {
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
            const response = await fetch(url, config);

            if (!response.ok) {
                const apiError = await parseApiError(response);
                if (response.status === 401) {
                    // Opcional: No borrar token inmediatamente si es solo login fallido, 
                    // pero si es una petición normal, sí.
                    if (endpoint !== '/login') localStorage.removeItem('authToken');
                }
                throw apiError;
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new Error('Error de conexión con el servidor. Verifique que el backend esté ejecutándose.');
                networkError.originalError = error;
                throw networkError;
            }
            throw error;
        }
    },

    // Auth
    async login(username, password) {
        return this.request('/login', { method: 'POST', body: { username, password } });
    },
    async logout() {
        try { await this.request('/logout', { method: 'POST' }); } 
        catch (e) { console.warn(e); } 
        finally { localStorage.removeItem('authToken'); }
    },
    async getUser() { return this.request('/user'); },

    // Bascula
    async listarPuertosBascula() { return this.request('/bascula/puertos'); },
    async conectarBascula(data) { return this.request('/bascula/conectar', { method: 'POST', body: data }); },
    async leerPesoBascula(data) { return this.request('/bascula/leer-peso', { method: 'POST', body: data }); },
    async desconectarBascula(data) { return this.request('/bascula/desconectar', { method: 'POST', body: data }); },

    // Registros
    async getRegistrosScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/registros-scrap?${query}`);
    },
    async getRegistrosConfig() { return this.request('/registros-scrap/configuracion'); },
    async createRegistroScrap(data) { return this.request('/registros-scrap', { method: 'POST', body: data }); },
    async getRegistroScrapStats() { return this.request('/registros-scrap/stats'); },

    // Recepciones
    async getRecepcionesScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/recepciones-scrap?${query}`);
    },
    async createRecepcionScrap(data) { return this.request('/recepciones-scrap', { method: 'POST', body: data }); },
    async updateRecepcionScrap(id, data) { return this.request(`/recepciones-scrap/${id}`, { method: 'PUT', body: data }); },

    // Usuarios
    async getUsers() { return this.request('/users'); },
    async createUser(data) { return this.request('/users', { method: 'POST', body: data }); },
    async updateUser(id, data) { return this.request(`/users/${id}`, { method: 'PUT', body: data }); },
    async deleteUser(id) { return this.request(`/users/${id}`, { method: 'DELETE' }); },
    async toggleUserStatus(id) { return this.request(`/users/${id}/toggle-status`, { method: 'PATCH' }); },

    // Dashboard
    async getDashboardStats() { return this.request('/dashboard/stats'); },

    // MATERIALES (Gestión)
    async getMaterialesPorUso(uso) { 
        return this.request(`/materiales/lista/${uso}`); 
    },
    async getAllMateriales() { 
        return this.request('/materiales'); 
    },
    async createMaterial(data) { 
        return this.request('/materiales', { method: 'POST', body: data }); 
    },
    async deleteMaterial(id) { 
        return this.request(`/materiales/${id}`, { method: 'DELETE' }); 
    },

    // GESTIÓN DE ÁREAS Y MÁQUINAS
    async getAllAreasMaquinas() { 
        return this.request('/config-areas'); 
    },
    async createAreaMaquina(data) { 
        return this.request('/config-areas', { method: 'POST', body: data }); 
    },
    async deleteAreaMaquina(id) { 
        return this.request(`/config-areas/${id}`, { method: 'DELETE' }); 
    },
};