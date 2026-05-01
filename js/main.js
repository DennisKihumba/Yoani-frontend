// main.js - application entry point
import { initNavigation, initAnimations } from './ui.js';
import { initCMSBinding } from './cms.js';
import { initContactForm } from './contact.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAnimations();
  initCMSBinding();
  initContactForm();
});