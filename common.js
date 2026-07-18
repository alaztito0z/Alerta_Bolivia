/* ============================================================
   js/common.js - Utilidades Compartidas del SAT Bolivia
   ============================================================ */

const AlertaBolivia = (function() {
  'use strict';

  // ---------- NOTIFICACIONES ----------
  function mostrarNotificacion(titulo, mensaje, duracion = 4000) {
    const toast = document.getElementById('notificationToast');
    const titleElem = document.getElementById('toastTitle');
    const messageElem = document.getElementById('toastMessage');

    // Si no existe el toast en el DOM, crearlo temporalmente o usar alert
    if (!toast) {
      console.warn('[AlertaBolivia] Toast no encontrado en el DOM. Usando alert.');
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

  // ---------- GEOLOCALIZACIÓN ----------
  function obtenerUbicacion(opciones = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por el navegador.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, opciones);
    });
  }

  // ---------- ENVÍO DE ALERTA (Backend + n8n) ----------
  async function enviarAlerta(data) {
    const resultados = {
      backend: null,
      n8n: null
    };

    // 1. Enviar al Backend (Node.js + SQLite)
    try {
      const respBackend = await fetch('http://localhost:3000/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!respBackend.ok) throw new Error(`HTTP ${respBackend.status}`);
      resultados.backend = await respBackend.json();
    } catch (err) {
      console.warn('[AlertaBolivia] Error enviando al backend:', err.message);
      resultados.backend = { error: err.message };
    }

    // 2. Enviar a n8n (Webhook)
    try {
      const respN8n = await fetch('http://localhost:5678/webhook-emergencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          fuente: 'Alerta Bolivia - Web'
        })
      });
      if (!respN8n.ok) throw new Error(`HTTP ${respN8n.status}`);
      resultados.n8n = await respN8n.json().catch(() => ({ exito: true }));
    } catch (err) {
      console.warn('[AlertaBolivia] Error enviando a n8n:', err.message);
      resultados.n8n = { error: err.message };
    }

    return resultados;
  }

  // ---------- ACTUALIZAR FECHA/HORA ----------
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

  // ---------- HEADER SCROLL ----------
  function gestionarHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  // ---------- INICIALIZAR ELEMENTOS COMUNES ----------
  function inicializar() {
    // Header scroll
    window.addEventListener('scroll', gestionarHeader);

    // Actualizar fecha cada minuto
    actualizarFecha();
    setInterval(() => actualizarFecha(), 60000);

    // Delegación de eventos para el botón de emergencia (si existe)
    document.addEventListener('click', function(e) {
      const target = e.target.closest('.emergency-btn');
      if (target) {
        // Prevenir múltiples disparos si la función existe globalmente
        e.preventDefault();
        if (typeof window.mostrarAlertaRapida === 'function') {
          window.mostrarAlertaRapida();
        } else {
          // Función por defecto si no está definida
          alert('🚨 Alerta de emergencia.\nPor favor, llama al 911 inmediatamente.');
          if (AlertaBolivia) {
            AlertaBolivia.mostrarNotificacion('🚨 Emergencia', 'Llama al 911 o usa el formulario de denuncias.', 5000);
          }
        }
      }
    });

    // Cerrar modales con ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active, .modal-overlay.active').forEach(el => {
          el.classList.remove('active');
        });
        // También cerrar toasts si se desea
      }
    });

    // Cerrar modales haciendo clic fuera
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
    });

    console.log('%c🔵 Alerta Bolivia - Sistema Centralizado', 'font-size:18px; font-weight:bold; color:#00B4D4;');
    console.log('%cUtilidades compartidas cargadas correctamente.', 'color:#80D0FF;');
  }

  // ---------- EXPOSICIÓN PÚBLICA ----------
  return {
    mostrarNotificacion,
    obtenerUbicacion,
    enviarAlerta,
    actualizarFecha,
    gestionarHeader,
    inicializar
  };

})();

// Exponer globalmente para que las páginas específicas lo usen
window.AlertaBolivia = AlertaBolivia;

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AlertaBolivia.inicializar);
} else {
  AlertaBolivia.inicializar();
}