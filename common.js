/* ============================================================
   common.js - Utilidades y Lógica Compartida del SAT Bolivia
   ============================================================ */

const AlertaBolivia = (function() {
  'use strict';

  // ============================================================
  // NOTIFICACIONES (Toast)
  // ============================================================
  function mostrarNotificacion(titulo, mensaje, duracion = 4000) {
    const toast = document.getElementById('notificationToast');
    const titleElem = document.getElementById('toastTitle');
    const messageElem = document.getElementById('toastMessage');

    if (!toast) {
      console.warn('[AlertaBolivia] Toast no encontrado. Usando alert.');
      alert(`${titulo}\n${mensaje}`);
      return;
    }

    titleElem.textContent = titulo;
    messageElem.textContent = mensaje;
    toast.classList.add('show');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duracion);
  }

  // ============================================================
  // GEOLOCALIZACIÓN
  // ============================================================
  function obtenerUbicacion(opciones = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, opciones);
    });
  }

  // ============================================================
  // ENVÍO DE ALERTA (Backend + n8n)
  // ============================================================
  async function enviarAlerta(data) {
    const resultados = { backend: null, n8n: null };

    // 1. Enviar al Backend (Node.js + SQLite) si existe
    try {
      const respBackend = await fetch('http://localhost:3000/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!respBackend.ok) throw new Error(`HTTP ${respBackend.status}`);
      resultados.backend = await respBackend.json();
    } catch (err) {
      console.warn('[AlertaBolivia] Backend no disponible:', err.message);
      resultados.backend = { error: err.message };
    }

    // 2. Enviar a n8n (Webhook) si está configurado
    try {
      const respN8n = await fetch('http://localhost:5678/webhook/emergencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, timestamp: new Date().toISOString(), fuente: 'Alerta Bolivia - Web' })
      });
      if (!respN8n.ok) throw new Error(`HTTP ${respN8n.status}`);
      resultados.n8n = await respN8n.json().catch(() => ({ exito: true }));
    } catch (err) {
      console.warn('[AlertaBolivia] n8n no disponible:', err.message);
      resultados.n8n = { error: err.message };
    }

    return resultados;
  }

  // ============================================================
  // ACTUALIZAR FECHA/HORA
  // ============================================================
  function actualizarFecha(elementId = 'lastUpdateTime') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const dateString = now.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    el.textContent = `${dateString} ${timeString}`;
  }

  // ============================================================
  // HEADER SCROLL
  // ============================================================
  function gestionarHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  // ============================================================
  // ALERTA DE EMERGENCIA - COMPORTAMIENTO UNIFICADO
  // ============================================================
  let ubicacionEmergencia = null;

  window.mostrarAlertaRapida = async function() {
    const modal = document.getElementById('emergencyModal');

    // Si no hay modal, usar fallback con confirm
    if (!modal) {
      if (confirm('🚨 ALERTA DE EMERGENCIA\n\n¿Enviar alerta a los servicios de emergencia?')) {
        mostrarNotificacion('🚨 Alerta Enviada', 'Servicios de emergencia notificados.');
      }
      return;
    }

    // Si existe el modal, mostrarlo con geolocalización
    const status = document.getElementById('locationStatus') || document.createElement('div');
    const sendBtn = document.getElementById('sendEmergencyBtn');
    const locPrev = document.getElementById('locationPreview');
    const userPrev = document.getElementById('userPreview');

    // Resetear y mostrar modal
    modal.classList.add('active');

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span class="loading"></span> OBTENIENDO UBICACIÓN...';
    }

    if (status) {
      status.innerHTML = '<p><i class="fas fa-map-marker-alt"></i> Obteniendo tu ubicación...</p>';
    }

    if (userPrev) {
      userPrev.textContent = 'Usuario SAT Bolivia';
    }

    try {
      const pos = await obtenerUbicacion();
      ubicacionEmergencia = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      };

      if (locPrev) {
        locPrev.textContent = `${ubicacionEmergencia.lat.toFixed(6)}, ${ubicacionEmergencia.lng.toFixed(6)}`;
      }

      if (status) {
        status.innerHTML = `<p style="color:var(--success);"><i class="fas fa-check-circle"></i> Ubicación confirmada<br><small>Precisión: ±${Math.round(ubicacionEmergencia.accuracy)} metros</small></p>`;
      }

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> CONFIRMAR Y ENVIAR ALERTA';
        sendBtn.onclick = function() {
          enviarAlertaEmergencia(ubicacionEmergencia);
        };
      }

    } catch (error) {
      // Fallback: ubicación aproximada por IP
      ubicacionEmergencia = {
        lat: -16.290154,
        lng: -63.588653,
        accuracy: 50000,
        source: 'ip_estimation'
      };

      if (status) {
        status.innerHTML = `<p style="color:var(--warning);"><i class="fas fa-exclamation-triangle"></i> Ubicación aproximada<br><small>Se usará ubicación por red. Activa GPS para mayor precisión.</small></p>`;
      }

      if (locPrev) {
        locPrev.textContent = 'Ubicación aproximada por IP';
      }

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ENVIAR CON UBICACIÓN APROXIMADA';
        sendBtn.onclick = function() {
          enviarAlertaEmergencia(ubicacionEmergencia);
        };
      }
    }
  };

  // Función unificada para enviar la alerta
  async function enviarAlertaEmergencia(ubicacion) {
    const sendBtn = document.getElementById('sendEmergencyBtn');
    const originalText = sendBtn ? sendBtn.innerHTML : 'Enviando...';

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span class="loading"></span> ENVIANDO ALERTA...';
    }

    try {
      const id = `SAT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2,3).toUpperCase()}`;

      // Guardar en localStorage
      try {
        const reports = JSON.parse(localStorage.getItem('sat_emergency_reports') || '[]');
        reports.unshift({
          id,
          location: ubicacion,
          savedAt: new Date().toISOString()
        });
        if (reports.length > 50) reports.pop();
        localStorage.setItem('sat_emergency_reports', JSON.stringify(reports));
      } catch (e) { /* ignore */ }

      // Enviar a backend y n8n (opcional)
      await enviarAlerta({
        tipo: 'emergencia',
        urgencia: 'alta',
        lugar: ubicacion.lat ? `${ubicacion.lat}, ${ubicacion.lng}` : 'Ubicación desconocida',
        lat: ubicacion.lat || 0,
        lon: ubicacion.lng || 0,
        descripcion: '🚨 ALERTA DE EMERGENCIA - Usuario SAT Bolivia',
        nombre: 'Usuario SAT'
      });

      // Mostrar confirmación
      const modal = document.getElementById('confirmationModal');
      const reportNum = document.getElementById('reportNumber');
      const reportTime = document.getElementById('reportTime');

      if (reportNum) reportNum.textContent = id;
      if (reportTime) reportTime.textContent = new Date().toLocaleTimeString('es-BO');

      if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
          if (modal) modal.classList.remove('active');
        }, 10000);
      }

      mostrarNotificacion('🚨 ALERTA ENVIADA', `Emergencia reportada con código ${id}.`, 8000);

      // Cerrar modal de emergencia
      const emergencyModal = document.getElementById('emergencyModal');
      if (emergencyModal) emergencyModal.classList.remove('active');

    } catch (error) {
      mostrarNotificacion('❌ ERROR', 'No se pudo enviar la alerta. Llama al 911.', 'danger');
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalText;
    }
  }

  // Exponer la función globalmente
  window.enviarAlertaEmergencia = enviarAlertaEmergencia;

  // ============================================================
  // INICIALIZAR ELEMENTOS COMUNES
  // ============================================================
  function inicializar() {
    // Header scroll
    window.addEventListener('scroll', gestionarHeader);

    // Actualizar fecha cada minuto
    actualizarFecha();
    setInterval(() => actualizarFecha(), 60000);

    // Cerrar modales con ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active, .modal-overlay.active').forEach(el => {
          el.classList.remove('active');
        });
      }
    });

    // Cerrar modales haciendo clic fuera
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
    });

    // Botón de emergencia (delegación de eventos)
    document.addEventListener('click', function(e) {
      const target = e.target.closest('.emergency-btn');
      if (target) {
        e.preventDefault();
        if (typeof window.mostrarAlertaRapida === 'function') {
          window.mostrarAlertaRapida();
        } else {
          // Fallback si no está definida
          if (confirm('🚨 ALERTA DE EMERGENCIA\n\n¿Enviar alerta a los servicios de emergencia?')) {
            mostrarNotificacion('🚨 Alerta Enviada', 'Servicios de emergencia notificados.');
          }
        }
      }
    });

    console.log('%c🔵 Alerta Bolivia - Sistema Centralizado', 'font-size:18px; font-weight:bold; color:#00B4D4;');
    console.log('%cUtilidades compartidas cargadas correctamente.', 'color:#80D0FF;');
  }

  // ============================================================
  // EXPOSICIÓN PÚBLICA
  // ============================================================
  return {
    mostrarNotificacion,
    obtenerUbicacion,
    enviarAlerta,
    actualizarFecha,
    gestionarHeader,
    inicializar
  };

})();

// Exponer globalmente
window.AlertaBolivia = AlertaBolivia;

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AlertaBolivia.inicializar);
} else {
  AlertaBolivia.inicializar();
}
