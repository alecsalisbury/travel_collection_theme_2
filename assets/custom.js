/**
 * Include your custom JavaScript here.
 *
 * We also offer some hooks so you can plug your own logic. For instance, if you want to be notified when the variant
 * changes on product page, you can attach a listener to the document:
 *
 * document.addEventListener('variant:changed', function(event) {
 *   var variant = event.detail.variant; // Gives you access to the whole variant details
 * });
 *
 * You can also add a listener whenever a product is added to the cart:
 *
 * document.addEventListener('product:added', function(event) {
 *   var variant = event.detail.variant; // Get the variant that was added
 *   var quantity = event.detail.quantity; // Get the quantity that was added
 * });
 *
 * If you are an app developer and requires the theme to re-render the mini-cart, you can trigger your own event. If
 * you are adding a product, you need to trigger the "product:added" event, and make sure that you pass the quantity
 * that was added so the theme can properly update the quantity:
 *
 * document.documentElement.dispatchEvent(new CustomEvent('product:added', {
 *   bubbles: true,
 *   detail: {
 *     quantity: 1
 *   }
 * }));
 *
 * If you just want to force refresh the mini-cart without adding a specific product, you can trigger the event
 * "cart:refresh" in a similar way (in that case, passing the quantity is not necessary):
 *
 * document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
 *   bubbles: true
 * }));
 */

// App wrapper skeleton loader management
document.addEventListener('DOMContentLoaded', function () {
  const appWrappers = document.querySelectorAll('.the-app-wrapper.loading');

  appWrappers.forEach(wrapper => {
    // Set up a mutation observer to watch for content changes
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if meaningful content was added (not just empty divs)
          const hasContent = wrapper.querySelector('.yotpo-widget-instance, #infiniteoptions-container, [class*="app-"], [id*="app-"]');
          if (hasContent) {
            wrapper.classList.remove('loading');
            wrapper.classList.add('loaded');
            observer.disconnect();
          }
        }
      });
    });

    // Start observing
    observer.observe(wrapper, {
      childList: true,
      subtree: true
    });

    // Fallback: remove loading after 3 seconds regardless
    setTimeout(() => {
      if (wrapper.classList.contains('loading')) {
        wrapper.classList.remove('loading');
        wrapper.classList.add('loaded');
        observer.disconnect();
      }
    }, 3000);
  });
});

// Override Drift constructor globally when popup mode is detected
(function () {
  let originalDrift = null;
  let isPopupModeDetected = false;

  // Store original Drift constructor
  if (window.Drift) {
    originalDrift = window.Drift;
  }

  // Override Drift constructor
  window.Drift = function (element, options) {
    // Check if popup mode is enabled
    const productSection = document.querySelector('[data-section-type="product"]');
    if (productSection) {
      try {
        const sectionSettings = JSON.parse(productSection.getAttribute('data-section-settings') || '{}');
        if (sectionSettings.zoomEffect === 'popup') {
          isPopupModeDetected = true;
          console.log('Blocked Drift initialization for popup mode');
          // Return a dummy object
          return {
            enable: function () { },
            disable: function () { },
            destroy: function () { },
            setZoomImageURL: function () { }
          };
        }
      } catch (e) {
        console.warn('Error checking zoom mode:', e);
      }
    }

    // If not popup mode, use original Drift
    if (originalDrift) {
      return new originalDrift(element, options);
    }

    // Fallback dummy object
    return {
      enable: function () { },
      disable: function () { },
      destroy: function () { },
      setZoomImageURL: function () { }
    };
  };

  // Copy any static properties from original Drift
  if (originalDrift) {
    Object.keys(originalDrift).forEach(key => {
      window.Drift[key] = originalDrift[key];
    });
  }
})();

// Disable Drift.js zoom by modifying section settings when popup mode is enabled
(function () {
  // This needs to run before the ProductGallery class initializes
  const disableDriftForPopup = function () {
    const productSection = document.querySelector('[data-section-type="product"]');
    if (!productSection) return;

    try {
      const sectionSettings = JSON.parse(productSection.getAttribute('data-section-settings') || '{}');
      const isPopupZoom = sectionSettings.zoomEffect === 'popup';

      if (isPopupZoom) {
        // Modify the section settings to disable image zoom entirely for the ProductGallery class
        // This prevents the _createZoom method from running
        sectionSettings.enableImageZoom = false;
        productSection.setAttribute('data-section-settings', JSON.stringify(sectionSettings));

        // Also store the original setting so we know popup was intended
        productSection.setAttribute('data-original-zoom-enabled', 'true');
        productSection.setAttribute('data-popup-zoom-mode', 'true');

        console.log('Disabled Drift zoom for popup mode');

        // Also set up a MutationObserver to destroy any Drift elements that get created
        const observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
              // Remove any drift zoom panes that get added
              const driftPanes = document.querySelectorAll('.drift-zoom-pane, .drift-bounding-box');
              driftPanes.forEach(pane => pane.remove());

              // Remove drift classes from images
              const driftImages = document.querySelectorAll('.product-gallery__image.drift-demo-trigger');
              driftImages.forEach(img => {
                img.classList.remove('drift-demo-trigger');
                img.style.transform = '';
              });
            }
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {
      console.warn('Could not modify zoom settings:', e);
    }
  };

  // Aggressive cleanup function
  const cleanupDriftElements = function () {
    const productSection = document.querySelector('[data-section-type="product"]');
    if (!productSection || productSection.getAttribute('data-popup-zoom-mode') !== 'true') return;

    // Remove drift elements
    const driftPanes = document.querySelectorAll('.drift-zoom-pane, .drift-bounding-box');
    driftPanes.forEach(pane => pane.remove());

    // Remove drift classes and styles from images
    const driftImages = document.querySelectorAll('.product-gallery__image.drift-demo-trigger');
    driftImages.forEach(img => {
      img.classList.remove('drift-demo-trigger');
      img.style.transform = '';
      img.removeAttribute('data-drift');
    });
  };

  // Run as early as possible, multiple times to catch the section
  const runMultipleTimes = function () {
    disableDriftForPopup();
    // Also try again after a short delay to catch dynamically added content
    setTimeout(disableDriftForPopup, 100);
    setTimeout(disableDriftForPopup, 500);
    setTimeout(cleanupDriftElements, 1000);
    setTimeout(cleanupDriftElements, 2000);
  };

  // Run immediately
  runMultipleTimes();

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runMultipleTimes);
  } else {
    runMultipleTimes();
  }
})();

// REI-Style Zoom Modal Integration
document.addEventListener('DOMContentLoaded', function () {
  // Check if popup zoom is enabled
  const productSection = document.querySelector('[data-section-type="product"]');
  if (!productSection) return;

  // Check if popup zoom mode is enabled (using our custom attribute)
  const isPopupZoom = productSection.getAttribute('data-popup-zoom-mode') === 'true';

  // Only attach REI zoom modal if popup zoom is enabled
  if (!isPopupZoom) return;

  // Override product gallery image clicks to use REI zoom modal
  const productGalleryImages = document.querySelectorAll('.product-gallery__image');

  if (productGalleryImages.length > 0) {
    productGalleryImages.forEach((image, index) => {
      image.addEventListener('click', function (e) {
        // Prevent the default mobile zoom from opening
        e.stopPropagation();

        // Gather all product images for the modal
        const allImages = [];
        const galleryItems = document.querySelectorAll('.product-gallery__carousel-item[data-media-type="image"]:not(.is-filtered)');

        galleryItems.forEach((item, itemIndex) => {
          const img = item.querySelector('.product-gallery__image');
          if (img) {
            allImages.push({
              src: img.getAttribute('data-zoom') || img.src,
              alt: img.alt || '',
              index: itemIndex
            });
          }
        });

        // Find the current image index
        let currentIndex = 0;
        const currentItem = image.closest('.product-gallery__carousel-item');
        if (currentItem) {
          const currentMediaId = currentItem.getAttribute('data-media-id');
          galleryItems.forEach((item, itemIndex) => {
            if (item.getAttribute('data-media-id') === currentMediaId) {
              currentIndex = itemIndex;
            }
          });
        }

        // Open REI zoom modal
        if (window.openREIZoom && allImages.length > 0) {
          window.openREIZoom(allImages, currentIndex);
        }
      });
    });
  }

  // Also handle thumbnail clicks
  const thumbnails = document.querySelectorAll('.product-gallery__thumbnail');
  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', function (e) {
      // Let the default thumbnail behavior work (changing main image)
      // But also set up the click handler for the new main image
      setTimeout(() => {
        const newMainImage = document.querySelector('.product-gallery__carousel-item.is-selected .product-gallery__image');
        if (newMainImage && !newMainImage.hasREIZoomHandler && isPopupZoom) {
          newMainImage.hasREIZoomHandler = true;
          newMainImage.addEventListener('click', function (e) {
            e.stopPropagation();

            const allImages = [];
            const galleryItems = document.querySelectorAll('.product-gallery__carousel-item[data-media-type="image"]:not(.is-filtered)');

            galleryItems.forEach((item, itemIndex) => {
              const img = item.querySelector('.product-gallery__image');
              if (img) {
                allImages.push({
                  src: img.getAttribute('data-zoom') || img.src,
                  alt: img.alt || '',
                  index: itemIndex
                });
              }
            });

            let currentIndex = 0;
            const currentItem = newMainImage.closest('.product-gallery__carousel-item');
            if (currentItem) {
              const currentMediaId = currentItem.getAttribute('data-media-id');
              galleryItems.forEach((item, itemIndex) => {
                if (item.getAttribute('data-media-id') === currentMediaId) {
                  currentIndex = itemIndex;
                }
              });
            }

            if (window.openREIZoom && allImages.length > 0) {
              window.openREIZoom(allImages, currentIndex);
            }
          });
        }
      }, 100);
    });
  });
});


(function () {
  // SECTION scope (falls back to document if Liquid id is not available)
  const SECTION = document.getElementById('shopify-section-{{ section.id }}') || document;

  // Global lock flag: when true, Add to Cart and Payment Button must not work
  let locked = false;

  // Utility to collect all relevant buttons within SECTION scope
  function getButtons(scope = SECTION) {
    return scope.querySelectorAll(
      'form.product-form [type="submit"], button[name="add"], .shopify-payment-button__button'
    );
  }

  // Ensure we inject a single <style> that disables pointer events while locked
  (function ensureLockStyles() {
    if (document.getElementById('apps-loading-style')) return;
    const style = document.createElement('style');
    style.id = 'apps-loading-style';
    style.textContent = `
      html.apps-loading .shopify-payment-button,
      html.apps-loading .shopify-payment-button__button,
      html.apps-loading form.product-form [type="submit"],
      html.apps-loading button[name="add"] {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  })();

  // Toggle lock state: updates buttons ARIA/disabled and a global HTML class
  function setLock(state) {
    if (locked === state) return;
    locked = state;

    // Visual/ARIA state on buttons
    getButtons().forEach((btn) => {
      if (!btn) return;
      if (state) {
        btn.setAttribute('disabled', 'disabled');
        btn.classList.add('is-disabled');
        btn.setAttribute('aria-busy', 'true');
      } else {
        btn.removeAttribute('disabled');
        btn.classList.remove('is-disabled');
        btn.removeAttribute('aria-busy');
      }
    });

    // Global CSS flag; also used by pointer-events hard lock
    document.documentElement.classList.toggle('apps-loading', state);
  }

  // Returns true if any app wrapper is still loading (keeps lock on)
  function anyAppsLoading() {
    return document.querySelector('.the-app-wrapper.loading') !== null;
  }

  // Re-evaluate and apply lock state
  function refresh() {
    setLock(anyAppsLoading());
  }

  // --- HARD GUARDS (events + programmatic + network) ---
  // Install once to avoid duplicate handlers on re-executions
  if (!window.__cartHardLockInstalled) {
    window.__cartHardLockInstalled = true;

    // 1) Early interaction guards in CAPTURE phase (run before theme/app handlers)
    ['pointerdown', 'mousedown', 'click'].forEach((type) => {
      document.addEventListener(type, function (e) {
        if (!locked) return;
        const t = e.target;
        // Target Add-to-Cart, product form submit buttons, and Shopify Payment Button
        if (
          t &&
          (t.closest('form.product-form [type="submit"]') ||
            t.closest('button[name="add"]') ||
            t.closest('.shopify-payment-button__button'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
      }, true); // capture
    });

    // 2) Block any <form> submit (covers Enter key and most script-driven submits)
    document.addEventListener('submit', function (e) {
      if (!locked) return;
      if (e.target && e.target.closest('form.product-form')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    }, true); // capture

    // 3) Block programmatic submits (form.submit() and form.requestSubmit())
    (function hardenFormSubmit() {
      const originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function () {
        try {
          if (locked && this.closest && this.closest('form.product-form')) return;
        } catch (_) { }
        return originalSubmit.apply(this, arguments);
      };
      const originalRequestSubmit = HTMLFormElement.prototype.requestSubmit;
      if (originalRequestSubmit) {
        HTMLFormElement.prototype.requestSubmit = function () {
          try {
            if (locked && this.closest && this.closest('form.product-form')) return;
          } catch (_) { }
          return originalRequestSubmit.apply(this, arguments);
        };
      }
    })();

    // 4) Network hard-block for cart endpoints while locked (covers AJAX flows)
    const CART_PATHS = ['/cart/add', '/cart/add.js', '/cart/change', '/cart/update', '/cart/clear'];

    function isCartURL(input) {
      try {
        const href = typeof input === 'string' ? input : (input && input.url) || '';
        return CART_PATHS.some((p) => href.includes(p));
      } catch { return false; }
    }

    // Intercept fetch()
    (function patchFetch() {
      const _fetch = window.fetch;
      if (!_fetch) return;
      window.fetch = function (input, init) {
        if (locked && isCartURL(input)) {
          // Reject cart-related requests while locked
          return Promise.reject(new DOMException('Cart locked', 'AbortError'));
        }
        return _fetch.apply(this, arguments);
      };
    })();

    // Intercept XMLHttpRequest
    (function patchXHR() {
      const _open = XMLHttpRequest.prototype.open;
      const _send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__isCartReq = isCartURL(url || '');
        return _open.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (locked && this.__isCartReq) {
          try { this.abort(); } catch (_) { }
          return; // swallow the request
        }
        return _send.apply(this, arguments);
      };
    })();
  }
  // --- END HARD GUARDS ---

  // Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }

  // Watch all app wrappers; any class change to/from 'loading' triggers refresh()
  const wrappers = document.querySelectorAll('.the-app-wrapper');
  wrappers.forEach((w) => {
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          refresh();
          break;
        }
      }
    }).observe(w, { attributes: true, attributeFilter: ['class'] });
  });

  // Re-apply lock after product UI re-renders (variant changes, etc.)
  document.addEventListener('variant:changed', () => setTimeout(refresh, 0));
  document.addEventListener('product:variant:change', () => setTimeout(refresh, 0));
  document.addEventListener('product:rerendered', () => setTimeout(refresh, 0));

  // If buttons are replaced in DOM, re-apply the current lock state
  const sectionObserver = new MutationObserver(() => setTimeout(() => setLock(locked), 0));
  sectionObserver.observe(SECTION, { childList: true, subtree: true });
})();
