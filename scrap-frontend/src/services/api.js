/* src/services/api.js */

// Lógica inteligente para determinar la URL base
// Detecta la IP actual del navegador y asume que el backend está en la misma IP pero puerto 8002
const getBaseUrl = () => {
  // Si existe una variable de entorno forzada, úsala
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  const protocol = window.location.protocol; // http: o https:
  const hostname = window.location.hostname; // localhost, 192.168.x.x, etc.
  
  // Apuntamos siempre al puerto 8002 para Laravel
  return `${protocol}//${hostname}:8002/api`;
};

const API_BASE_URL = getBaseUrl();

const getAuthToken = () => localStorage.getItem('authToken');

const parseApiError = async (response) => {
    const status = response.status;
    try {
        const errorData = await response.json();
        
        // Manejo de errores de validación de Laravel (422)
        if (status === 422 && errorData.errors) {
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

// Helper para lectura rápida con timeout
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout: La solicitud tardó demasiado');
        }
        throw error;
    }
};

export const apiClient = {
    async request(endpoint, options = {}, timeout = 10000) { 
        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAuthToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            credentials: 'include', // IMPORTANTE para Sanctum/Cookies
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetchWithTimeout(url, config, timeout);

            if (!response.ok) {
                const apiError = await parseApiError(response);
                if (response.status === 401) {
                    if (endpoint !== '/login') localStorage.removeItem('authToken');
                }
                throw apiError;
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new Error(`No se pudo conectar al servidor en ${API_BASE_URL}. Asegúrese de ejecutar el backend con: php artisan serve --host=0.0.0.0 --port=8002`);
                networkError.originalError = error;
                throw networkError;
            }
            throw error;
        }
    },

    // Auth
    async login(username, password) {
        try {
            // Ajuste dinámico para CSRF
            const csrfUrl = API_BASE_URL.replace('/api', '/sanctum/csrf-cookie');
            await fetch(csrfUrl, { credentials: 'include' });
        } catch (e) {
            console.warn('No se pudo obtener CSRF cookie, intentando login directo...', e);
        }
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

    // Reportes
    async enviarReporteCorreo(data) {
        return this.request('/excel/enviar-reporte-correo', { 
            method: 'POST', 
            body: data 
        });
    },
    
    async getPreviewReporte(params) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/excel/preview-formato-empresa?${query}`);
    }
};