/**
 * REI-Style Zoom Modal
 * Provides fullscreen image viewing with zoom controls and pan functionality
 */
class REIZoomModal {
  constructor() {
    this.modal = null;
    this.currentImageIndex = 0;
    this.images = [];
    this.zoomLevel = 1; // 1 = 100%, 2 = 200%, 3 = 300%
    this.maxZoom = 3;
    this.minZoom = 1;
    
    // Pan variables
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.translateX = 0;
    this.translateY = 0;
    
    this.init();
  }
  
  init() {
    this.createModal();
    this.bindEvents();
  }
  
  createModal() {
    // Modal should already exist from Liquid template
    this.modal = document.getElementById('rei-zoom-modal');
    if (!this.modal) {
      console.error('REI Zoom Modal element not found');
      return;
    }
    
    // Get references to modal elements
    this.backdrop = this.modal.querySelector('.rei-zoom-modal__backdrop');
    this.closeBtn = this.modal.querySelector('.rei-zoom-modal__close');
    this.zoomInBtn = this.modal.querySelector('.rei-zoom-modal__zoom-in');
    this.zoomOutBtn = this.modal.querySelector('.rei-zoom-modal__zoom-out');
    this.zoomLevelDisplay = this.modal.querySelector('.rei-zoom-modal__zoom-level');
    this.imageContainer = this.modal.querySelector('.rei-zoom-modal__image-container');
    this.imageWrapper = this.modal.querySelector('.rei-zoom-modal__image-wrapper');
    this.image = this.modal.querySelector('.rei-zoom-modal__image');
    this.prevBtn = this.modal.querySelector('.rei-zoom-modal__nav--prev');
    this.nextBtn = this.modal.querySelector('.rei-zoom-modal__nav--next');
  }
  
  bindEvents() {
    if (!this.modal) return;
    
    // Close events
    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());
    
    // Zoom events
    this.zoomInBtn?.addEventListener('click', () => this.zoomIn());
    this.zoomOutBtn?.addEventListener('click', () => this.zoomOut());
    
    // Navigation events
    this.prevBtn?.addEventListener('click', () => this.previousImage());
    this.nextBtn?.addEventListener('click', () => this.nextImage());
    
    // Pan events
    this.imageWrapper?.addEventListener('mousedown', (e) => this.startPan(e));
    this.imageWrapper?.addEventListener('mousemove', (e) => this.pan(e));
    this.imageWrapper?.addEventListener('mouseup', () => this.endPan());
    this.imageWrapper?.addEventListener('mouseleave', () => this.endPan());
    
    // Touch events for mobile panning
    this.imageWrapper?.addEventListener('touchstart', (e) => this.startPan(e), { passive: false });
    this.imageWrapper?.addEventListener('touchmove', (e) => this.pan(e), { passive: false });
    this.imageWrapper?.addEventListener('touchend', () => this.endPan());
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Prevent context menu on image
    this.image?.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  open(imageData, startIndex = 0) {
    this.images = imageData;
    this.currentImageIndex = startIndex;
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    
    this.loadCurrentImage();
    this.updateZoomControls();
    this.updateNavigationControls();
    
    // Show modal
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus management
    this.modal.focus();
  }
  
  close() {
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Reset transforms
    this.resetImageTransform();
  }
  
  loadCurrentImage() {
    if (!this.images[this.currentImageIndex]) return;
    
    const currentImage = this.images[this.currentImageIndex];
    this.image.src = currentImage.src;
    this.image.alt = currentImage.alt || '';
    
    // Reset zoom and pan when loading new image
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateImageTransform();
  }
  
  zoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel++;
      this.updateImageTransform();
      this.updateZoomControls();
    }
  }
  
  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel--;
      // Reset pan when zooming out to 100%
      if (this.zoomLevel === 1) {
        this.translateX = 0;
        this.translateY = 0;
      }
      this.updateImageTransform();
      this.updateZoomControls();
    }
  }
  
  previousImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.loadCurrentImage();
      this.updateNavigationControls();
      this.updateZoomControls();
    }
  }
  
  nextImage() {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
      this.loadCurrentImage();
      this.updateNavigationControls();
      this.updateZoomControls();
    }
  }
  
  startPan(e) {
    if (this.zoomLevel <= 1) return; // Only allow panning when zoomed in
    
    this.isPanning = true;
    this.imageWrapper.classList.add('is-dragging');
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    this.startX = clientX - this.translateX;
    this.startY = clientY - this.translateY;
    
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
  }
  
  pan(e) {
    if (!this.isPanning || this.zoomLevel <= 1) return;
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    this.translateX = clientX - this.startX;
    this.translateY = clientY - this.startY;
    
    // Constrain panning to keep image within bounds
    this.constrainPan();
    this.updateImageTransform();
    
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
  }
  
  endPan() {
    this.isPanning = false;
    this.imageWrapper.classList.remove('is-dragging');
  }
  
  constrainPan() {
    const containerRect = this.imageContainer.getBoundingClientRect();
    const imageRect = this.image.getBoundingClientRect();
    
    // Calculate the scaled image dimensions
    const scaledWidth = imageRect.width * this.zoomLevel;
    const scaledHeight = imageRect.height * this.zoomLevel;
    
    // Calculate maximum translation values
    const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    
    // Constrain translation
    this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
    this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
  }
  
  updateImageTransform() {
    const transform = `translate(${this.translateX}px, ${this.translateY}px)`;
    const scale = `scale(${this.zoomLevel})`;
    
    this.imageWrapper.style.transform = transform;
    this.image.style.transform = scale;
  }
  
  resetImageTransform() {
    this.imageWrapper.style.transform = '';
    this.image.style.transform = '';
  }
  
  updateZoomControls() {
    // Update zoom level display
    this.zoomLevelDisplay.textContent = `${this.zoomLevel * 100}%`;
    
    // Update button states
    this.zoomOutBtn.disabled = this.zoomLevel <= this.minZoom;
    this.zoomInBtn.disabled = this.zoomLevel >= this.maxZoom;
  }
  
  updateNavigationControls() {
    this.prevBtn.disabled = this.currentImageIndex <= 0;
    this.nextBtn.disabled = this.currentImageIndex >= this.images.length - 1;
    
    // Hide navigation if only one image
    const shouldShowNav = this.images.length > 1;
    this.prevBtn.style.display = shouldShowNav ? 'block' : 'none';
    this.nextBtn.style.display = shouldShowNav ? 'block' : 'none';
  }
  
  handleKeydown(e) {
    if (this.modal.getAttribute('aria-hidden') === 'true') return;
    
    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.previousImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.nextImage();
        break;
      case '+':
      case '=':
        e.preventDefault();
        this.zoomIn();
        break;
      case '-':
        e.preventDefault();
        this.zoomOut();
        break;
    }
  }
}

// Initialize the modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.reiZoomModal = new REIZoomModal();
});

// Helper function to open zoom modal from product gallery
window.openREIZoom = (images, startIndex = 0) => {
  if (window.reiZoomModal) {
    window.reiZoomModal.open(images, startIndex);
  }
};
