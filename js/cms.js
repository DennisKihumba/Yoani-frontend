// cms.js - fetches data from Strapi and injects into DOM
import { CMS_CONFIG } from './config.js';

export async function initCMSBinding() {
    if (!CMS_CONFIG.ENABLED) {
        console.log('CMS is disabled – using static content.');
        return;
    }

    try {
        const [homeData, programsData, blogData, parentZoneData] = await Promise.all([
            fetchData('/home-page'),
            fetchData('/programs?populate=*'),
            fetchData('/blog-posts?populate=*'),
            fetchData('/parent-resources?populate=*')
        ]);

        injectHomePage(homeData);
        injectPrograms(programsData);
        injectBlogPosts(blogData);
        injectParentResources(parentZoneData);

        document.dispatchEvent(new CustomEvent('cms:loaded', {
            detail: { home: homeData, programs: programsData, blog: blogData }
        }));
    } catch (error) {
        console.error('CMS fetch failed – using static fallback content.', error);
    }
}

async function fetchData(endpoint) {
    const response = await fetch(`${CMS_CONFIG.API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function getStrapiMediaUrl(media) {
    if (!media || !media.url) return null;
    if (media.url.startsWith('http')) return media.url;
    const baseUrl = CMS_CONFIG.API_URL.replace('/api', '');
    return `${baseUrl}${media.url}`;
}

function injectHomePage(data) {
    if (!data || !data.data) return;
    const attrs = data.data;

    const heroTitle = document.querySelector('[data-cms="hero-title"]');
    if (heroTitle && attrs.heroTitle) heroTitle.textContent = attrs.heroTitle;

    const tagline = document.querySelector('[data-cms="tagline"]');
    if (tagline && attrs.tagline) tagline.textContent = attrs.tagline;

    const stats = document.querySelectorAll('[data-cms="stat"]');
    if (stats.length && attrs.stats && Array.isArray(attrs.stats)) {
        stats.forEach((el, idx) => {
            if (attrs.stats[idx]) {
                let statValue = attrs.stats[idx];
                if (typeof statValue === 'object') {
                    statValue = statValue.text || statValue.value || JSON.stringify(statValue);
                }
                el.innerHTML = statValue;
            }
        });
    }

    const welcomeDiv = document.querySelector('[data-cms="welcome-text"]');
    if (welcomeDiv && attrs.welcomeText) {
        let html = '';
        if (typeof attrs.welcomeText === 'string') {
            html = attrs.welcomeText;
        } else if (Array.isArray(attrs.welcomeText)) {
            html = attrs.welcomeText.map(block => {
                if (block.type === 'paragraph') {
                    const text = block.children && block.children.map(child => child.text).join('') || '';
                    return `<p>${text}</p>`;
                }
                if (block.type === 'heading') {
                    const level = block.level || 2;
                    const text = block.children && block.children.map(child => child.text).join('') || '';
                    return `<h${level}>${text}</h${level}>`;
                }
                return '';
            }).join('');
        } else if (typeof attrs.welcomeText === 'object' && attrs.welcomeText.children) {
            html = attrs.welcomeText.children.map(child => `<p>${child.text}</p>`).join('');
        } else {
            html = String(attrs.welcomeText);
        }
        welcomeDiv.innerHTML = html;
    }
}

function injectPrograms(data) {
    if (!data || !data.data) return;
    const programCards = document.querySelectorAll('[data-program]');
    programCards.forEach((card, idx) => {
        if (data.data[idx]) {
            const titleEl = card.querySelector('h3');
            const descEl = card.querySelector('p');
            if (titleEl) titleEl.textContent = data.data[idx].title;
            if (descEl) {
                let descText = data.data[idx].description;
                if (typeof descText === 'object') {
                    descText = descText.children && descText.children[0] && descText.children[0].text || '';
                }
                descEl.textContent = descText;
            }
        }
    });
}

function injectBlogPosts(data) {
    if (!data || !data.data) return;
    const blogContainer = document.querySelector('.blog-grid');
    if (!blogContainer) return;

    blogContainer.innerHTML = '';
    data.data.forEach(post => {
        const article = document.createElement('article');
        article.className = 'blog-card';
        const imageUrl = getStrapiMediaUrl(post.image) || 'https://picsum.photos/id/20/400/250';
        const postDate = post.date ? new Date(post.date).toLocaleDateString() : '';
        const title = post.title || '';
        const excerpt = post.excerpt || '';

        // Store the full content as a data attribute (rich text or string)
        let fullContent = post.content || '';
        // If content is an array (Strapi rich text), stringify it to store
        if (typeof fullContent === 'object') {
            fullContent = JSON.stringify(fullContent);
        }

        article.innerHTML = `
      <div class="blog-image">
        <img src="${imageUrl}" alt="${title}" loading="lazy">
      </div>
      <div class="blog-content">
        <span class="blog-date">${postDate}</span>
        <h3>${title}</h3>
        <p>${excerpt}</p>
        <button class="read-more-btn" data-title="${title.replace(/"/g, '&quot;')}" data-content="${encodeURIComponent(fullContent)}">Read more →</button>
      </div>
    `;
        blogContainer.appendChild(article);
    });

    // Add modal functionality
    const modal = document.getElementById('blogModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const closeBtn = document.querySelector('.close-modal');

    if (!modal) return;

    // Helper to convert rich text array to HTML
    function renderRichText(content) {
        if (!content) return '<p>No additional content.</p>';
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(block => {
                if (block.type === 'paragraph') {
                    const text = block.children && block.children.map(c => c.text).join('') || '';
                    return `<p>${text}</p>`;
                }
                if (block.type === 'heading') {
                    const level = block.level || 2;
                    const text = block.children && block.children.map(c => c.text).join('') || '';
                    return `<h${level}>${text}</h${level}>`;
                }
                if (block.type === 'list') {
                    const items = block.children && block.children.map(item => {
                        const itemText = item.children && item.children.map(c => c.text).join('') || '';
                        return `<li>${itemText}</li>`;
                    }).join('');
                    return `<ul>${items}</ul>`;
                }
                return '';
            }).join('');
        }
        return String(content);
    }

    function openModal(title, rawContent) {
        modalTitle.innerText = title;
        let contentHtml = '';
        try {
            const decoded = decodeURIComponent(rawContent);
            const parsed = JSON.parse(decoded);
            contentHtml = renderRichText(parsed);
        } catch (e) {
            // Not JSON – treat as plain text or HTML
            contentHtml = decodeURIComponent(rawContent);
        }
        modalContent.innerHTML = contentHtml;
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        modalContent.innerHTML = '';
        modalTitle.innerText = '';
    }

    // Attach event listeners to all read-more buttons
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const title = btn.getAttribute('data-title');
            const content = btn.getAttribute('data-content');
            openModal(title, content);
        });
    });

    // Close modal when clicking X or outside the modal content
    if (closeBtn) closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

function injectParentResources(data) {
    if (!data || !data.data) return;
    const resourceCards = document.querySelectorAll('.resource-card');
    resourceCards.forEach((card, idx) => {
        if (data.data[idx]) {
            const resource = data.data[idx];
            const titleEl = card.querySelector('h3');
            if (titleEl) titleEl.textContent = resource.title;
            const descEl = card.querySelector('p');
            if (descEl) descEl.textContent = resource.description;

            const downloadLink = card.querySelector('.btn-download');
            if (downloadLink && resource.pdfFile) {
                const pdfUrl = getStrapiMediaUrl(resource.pdfFile);
                if (pdfUrl) downloadLink.href = pdfUrl;
            }
        }
    });
}