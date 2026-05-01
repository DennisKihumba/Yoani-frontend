// contact.js - Handles contact form submission with EmailJS
export function initContactForm() {
  const form = document.getElementById('contactForm');
  const statusDiv = document.getElementById('formStatus');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    statusDiv.innerHTML = 'Sending message...';
    statusDiv.style.color = '#f97316';

    // ========== REPLACE THESE THREE VALUES WITH YOUR EMAILJS CREDENTIALS ==========
    const SERVICE_ID = 'service_2kmcyun';
    const TEMPLATE_ID = 'template_wpto0ro';
    const PUBLIC_KEY = '0WMawkwrpGjIPCski';
    // =============================================================================

    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form, PUBLIC_KEY);
      statusDiv.innerHTML = '✅ Message sent successfully! We will get back to you soon.';
      statusDiv.style.color = '#16a34a';
      form.reset();
    } catch (error) {
      statusDiv.innerHTML = '❌ Failed to send. Please try again later.';
      statusDiv.style.color = '#dc2626';
      console.error('EmailJS error:', error);
    }
  });
}