/**
 * Calendifier Loader Script
 * Ensures proper loading order of all Calendifier components
 * This script must be loaded first to establish the dependency chain
 */

(function() {
  'use strict';
  
  
  // Track loading state
  window.calendifierLoadingState = {
    translationManager: false,
    baseCard: false,
    cards: {
      help: false,
      events: false,
      calendar: false,
      clock: false,
      notes: false,
      data: false
    },
    ready: false
  };
  
  // Get base URL for scripts
  function getScriptBaseUrl() {
    const host = window.location.hostname;
    return `/local/`;
  }
  
  // Load script with promise
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ Failed to load: ${src}`);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
  }
  
  // Load scripts in correct order
  async function loadCalendifierScripts() {
    try {
      const baseUrl = getScriptBaseUrl();
      
      await loadScript(`${baseUrl}calendifier-translation-manager.js`);
      window.calendifierLoadingState.translationManager = true;
      
      // Wait for translation manager to initialize
      let attempts = 0;
      while (!window.calendifierTranslationManager && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.calendifierTranslationManager) {
        throw new Error('Translation manager failed to initialize');
      }
      
      await loadScript(`${baseUrl}calendifier-base-card.js`);
      window.calendifierLoadingState.baseCard = true;
      
      const cardScripts = [
        'calendifier-help-card.js',
        'calendifier-events-card.js',
        'calendifier-calendar-card.js',
        'calendifier-clock-card.js',
        'calendifier-notes-card.js',
        'calendifier-data-card.js'
      ];
      
      // Load cards in parallel since they don't depend on each other
      await Promise.all(cardScripts.map(script => loadScript(`${baseUrl}${script}`)));
      
      // Mark cards as loaded
      window.calendifierLoadingState.cards.help = true;
      window.calendifierLoadingState.cards.events = true;
      window.calendifierLoadingState.cards.calendar = true;
      window.calendifierLoadingState.cards.clock = true;
      window.calendifierLoadingState.cards.notes = true;
      window.calendifierLoadingState.cards.data = true;
      
      window.calendifierLoadingState.ready = true;
      
      
      // Dispatch ready event
      const event = new CustomEvent('calendifier-ready', {
        detail: { loadingState: window.calendifierLoadingState },
        bubbles: true,
        composed: true
      });
      document.dispatchEvent(event);
      
      // Initialize translation manager
      if (window.calendifierTranslationManager && !window.calendifierTranslationManager.isReady) {
        await window.calendifierTranslationManager.init();
      }
      
    } catch (error) {
      console.error('❌ Failed to load Calendifier components:', error);
      
      // Dispatch error event
      const errorEvent = new CustomEvent('calendifier-load-error', {
        detail: { error: error.message },
        bubbles: true,
        composed: true
      });
      document.dispatchEvent(errorEvent);
    }
  }
  
  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCalendifierScripts);
  } else {
    loadCalendifierScripts();
  }
  
  // Debug utilities
  window.calendifierDebugLoader = {
    getLoadingState: () => window.calendifierLoadingState,
    reload: () => {
      window.calendifierLoadingState.ready = false;
      loadCalendifierScripts();
    },
    checkTranslations: () => {
      if (window.calendifierTranslationManager) {
        return window.calendifierTranslationManager.getStats();
      }
      return { error: 'Translation manager not loaded' };
    }
  };
  
})();
