const API_BASE_URL = 'http://localhost:8000/api';

const getAuthToken = () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No se encontró token de autenticación');
      if (window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    return token;
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

    console.log(`🔄 Haciendo petición a: ${url}`, {
      tieneToken: !!token,
      metodo: options.method || 'GET'
    });

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
    } else {
      console.warn('⚠️ Realizando petición sin token de autenticación');
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      console.log(`📨 Respuesta recibida: ${response.status} ${response.statusText}`, {
        url: url,
        status: response.status,
        ok: response.ok
      });

      if (response.status === 401) {
        console.warn('🔐 Sesión expirada - Redirigiendo al login');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      if (response.status === 403) {
        throw new Error('No tiene permisos para realizar esta acción');
      }

      if (response.status === 404) {
        console.error(`❌ Ruta no encontrada: ${url}`);
        throw new Error(`Recurso no encontrado: ${endpoint}`);
      }

      if (response.status >= 500) {
        throw new Error('Error interno del servidor. Por favor, intente más tarde.');
      }

      const responseText = await response.text();
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.warn('❌ Respuesta no es JSON válido:', responseText.substring(0, 100));
        throw new Error(`Respuesta del servidor no es válida: ${response.status}`);
      }

      if (!response.ok) {
        const errorMessage = data.message || 
                            data.error || 
                            `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      console.log('✅ Petición exitosa:', data);
      return data;

    } catch (error) {
      console.error(`💥 Error en petición ${url}:`, error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Verifique que el servidor esté ejecutándose.');
      }
      
      throw error;
    }
  },

  // ========== AUTENTICACIÓN ==========
  async login(username, password) {
    const result = await this.request('/login', {
      method: 'POST',
      body: { username, password },
    });
    
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return result;
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

  // ========== BÁSCULA ==========
  async listarPuertosBascula() {
    try {
      console.log('🔄 Solicitando lista de puertos...');
      const result = await this.request('/bascula/puertos');
      console.log('✅ Puertos obtenidos:', result.puertos?.length || 0, 'puertos');
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo puertos:', error);
      return {
        success: true,
        puertos: ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9'],
        sistema: 'windows',
        puerto_recomendado: 'COM3',
        mensaje: 'Usando puertos simulados por error de conexión',
        error: error.message
      };
    }
  },

  async conectarBascula(data = {}) {
    try {
      console.log('🔌 Conectando báscula con datos:', data);
      const result = await this.request('/bascula/conectar', {
        method: 'POST',
        body: data,
      });
      console.log('✅ Conexión exitosa - Peso:', result.peso_kg, 'kg');
      
      // Log información adicional
      if (result.formato_detectado) {
        console.log('🔍 Formato detectado:', result.formato_detectado);
      }
      if (result.tipo_deteccion) {
        console.log('🎯 Tipo de detección:', result.tipo_deteccion);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error conectando báscula:', error);
      throw error;
    }
  },

  async leerPesoBascula(data = {}) {
    try {
      console.log('⚖️ Solicitando peso con datos:', data);
      const result = await this.request('/bascula/leer-peso', {
        method: 'POST',
        body: data,
      });
      console.log('✅ Peso obtenido:', result.peso_kg, 'kg');
      
      // Log información adicional
      if (result.formato_detectado) {
        console.log('🔍 Formato detectado:', result.formato_detectado);
      }
      if (result.raw_data) {
        console.log('📋 Datos crudos:', result.raw_data);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error leyendo peso:', error);
      throw error;
    }
  },

  async configurarBascula(config) {
    return this.request('/bascula/configurar', {
      method: 'POST',
      body: config,
    });
  },

  async diagnosticoBascula() {
    return this.request('/bascula/diagnostico');
  },

  // ========== REGISTROS SCRAP ==========
  async getRegistrosScrap(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/registros-scrap?${queryParams}`);
  },

  async getRegistrosConfig() {
    return this.request('/registros-scrap/configuracion');
  },

  async conectarBasculaRegistro() {
    return this.request('/registros-scrap/conectar-bascula', {
      method: 'POST',
    });
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

  async generarReporteDiario(data) {
    return this.downloadPDF('/registros-scrap/generar-reporte-diario', data);
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

  async checkServerStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

export { isAuthenticated, getAuthToken };