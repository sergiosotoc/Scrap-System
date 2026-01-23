/* src/services/api.js */
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  return `${protocol}//${hostname}:8002/api`;
};

const API_BASE_URL = getBaseUrl();

const getAuthToken = () => localStorage.getItem('authToken');

const parseApiError = async (response) => {
    const status = response.status;
    try {
        const errorData = await response.json();
        
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

// Helper para lectura rápida con timeout AUMENTADO
const fetchWithTimeout = async (url, options = {}, timeout = 120000) => { // Aumentado a 120 segundos
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
            throw new Error(`Timeout: La solicitud tardó más de ${timeout/1000} segundos. Verifique la conexión del servidor.`);
        }
        throw error;
    }
};

export const apiClient = {
    async request(endpoint, options = {}, timeout = 60000) { // Default 60 segundos
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
                const networkError = new Error(`No se pudo conectar al servidor en ${API_BASE_URL}. Asegúrese de que el backend esté ejecutándose.`);
                networkError.originalError = error;
                throw networkError;
            }
            throw error;
        }
    },

    // 🔥 NUEVO: Método para guardado masivo en batch
    async createRegistroScrapBatch(dataArray) {
        return this.request('/registros-scrap/batch', {
            method: 'POST',
            body: { registros: dataArray }
        }, 180000); // 180 segundos para batch
    },

    // 🔥 NUEVO: Método para optimizar lecturas de báscula
    async leerPesoBasculaOptimizado(data, timeoutMs = 10000) {
        return this.request('/bascula/leer-peso', {
            method: 'POST',
            body: data
        }, timeoutMs);
    },

    // 🔥 NUEVO: Verificar estado del servidor
    async checkServerHealth() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Auth - con timeout más corto
    async login(username, password) {
        try {
            const csrfUrl = API_BASE_URL.replace('/api', '/sanctum/csrf-cookie');
            await fetch(csrfUrl, { 
                credentials: 'include',
                signal: AbortSignal.timeout(5000) 
            });
        } catch (e) {
            console.warn('No se pudo obtener CSRF cookie, intentando login directo...', e);
        }
        return this.request('/login', { method: 'POST', body: { username, password } }, 15000);
    },
    
    async logout() {
        try { 
            await this.request('/logout', { method: 'POST' }, 10000); 
        } catch (e) { 
            console.warn('Error en logout:', e); 
        } finally { 
            localStorage.removeItem('authToken'); 
        }
    },
    
    async getUser() { 
        return this.request('/user', {}, 15000); 
    },

    // Bascula - con timeout específicos
    async listarPuertosBascula() { 
        return this.request('/bascula/puertos', {}, 10000); 
    },
    
    async conectarBascula(data) { 
        return this.request('/bascula/conectar', { method: 'POST', body: data }, 15000); 
    },
    
    async leerPesoBascula(data) { 
        return this.request('/bascula/leer-peso', { method: 'POST', body: data }, 15000); 
    },
    
    async desconectarBascula(data) { 
        return this.request('/bascula/desconectar', { method: 'POST', body: data }, 10000); 
    },

    // Registros - con timeout optimizados
    async getRegistrosScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/registros-scrap?${query}`, {}, 30000);
    },
    
    async getRegistrosConfig() { 
        return this.request('/registros-scrap/configuracion', {}, 30000);
    },
    
    async createRegistroScrap(data) { 
        return this.request('/registros-scrap', { method: 'POST', body: data }, 30000); 
    },
    
    async getRegistroScrapStats() { 
        return this.request('/registros-scrap/stats', {}, 15000); 
    },

    // Recepciones
    async getRecepcionesScrap(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/recepciones-scrap?${query}`, {}, 30000);
    },
    
    async createRecepcionScrap(data) { 
        return this.request('/recepciones-scrap', { method: 'POST', body: data }, 30000); 
    },
    
    async updateRecepcionScrap(id, data) { 
        return this.request(`/recepciones-scrap/${id}`, { method: 'PUT', body: data }, 30000); 
    },

    // Usuarios
    async getUsers() { 
        return this.request('/users', {}, 15000); 
    },
    
    async createUser(data) { 
        return this.request('/users', { method: 'POST', body: data }, 30000); 
    },
    
    async updateUser(id, data) { 
        return this.request(`/users/${id}`, { method: 'PUT', body: data }, 30000); 
    },
    
    async deleteUser(id) { 
        return this.request(`/users/${id}`, { method: 'DELETE' }, 15000); 
    },
    
    async toggleUserStatus(id) { 
        return this.request(`/users/${id}/toggle-status`, { method: 'PATCH' }, 15000); 
    },

    // Dashboard
    async getDashboardStats() { 
        return this.request('/dashboard/stats', {}, 15000); 
    },

    // MATERIALES
    async getMaterialesPorUso(uso) { 
        return this.request(`/materiales/lista/${uso}`, {}, 15000); 
    },
    
    async getAllMateriales() { 
        return this.request('/materiales', {}, 30000); 
    },
    
    async createMaterial(data) { 
        return this.request('/materiales', { method: 'POST', body: data }, 30000); 
    },
    
    async deleteMaterial(id) { 
        return this.request(`/materiales/${id}`, { method: 'DELETE' }, 15000); 
    },

    // GESTIÓN DE ÁREAS Y MÁQUINAS
    async getAllAreasMaquinas() { 
        return this.request('/config-areas', {}, 30000); 
    },
    
    async createAreaMaquina(data) { 
        return this.request('/config-areas', { method: 'POST', body: data }, 30000); 
    },
    
    async deleteAreaMaquina(id) { 
        return this.request(`/config-areas/${id}`, { method: 'DELETE' }, 15000); 
    },

    // GESTIÓN DE DESTINATARIOS DE CORREO
    async getDestinatarios() { 
        return this.request('/destinatarios', {}, 15000); 
    },
    
    async createDestinatario(data) { 
        return this.request('/destinatarios', { 
            method: 'POST', 
            body: data 
        }, 30000); 
    },
    
    async deleteDestinatario(id) { 
        return this.request(`/destinatarios/${id}`, { 
            method: 'DELETE' 
        }, 15000); 
    },

    // Reportes
    async enviarReporteCorreo(data) {
        return this.request('/excel/enviar-reporte-correo', { 
            method: 'POST', 
            body: data 
        }, 60000);
    },
    
    async getPreviewReporte(params) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/excel/preview-formato-empresa?${query}`, {}, 30000);
    }
};