/**
 * ==========================================================================
 * ATELIER DE MAIK — APPLICATION ENGINE
 * Interface fluide, recherche temps réel, gestionnaire de projets
 * ==========================================================================
 */

const DEFAULT_PROJECTS = [
  {
    "id": "kernel-memory-inspector",
    "title": "Kernel Memory Inspector",
    "category": "security",
    "categoryLabel": "Sécurité & Kernel",
    "status": "stable",
    "statusLabel": "Stable v1.4",
    "date": "2026-03",
    "shortDesc": "Mon driver Windows x64 pour inspecter la mémoire physique et virtuelle sans passer par les API userland surveillées.",
    "fullDesc": "Un driver développé en C et ASM x64 pour explorer les structures internes du noyau Windows (EPROCESS, ActiveProcessLinks, tables de pages). Il permet de cartographier la mémoire de n'importe quel processus via MDL mapping sans ouvrir de HANDLE suspect en ring-3.",
    "tags": ["C", "ASM x64", "Windows Kernel", "DKOM"],
    "features": [
      "Lecture/écriture mémoire physique et virtuelle via MDL",
      "Traduction manuelle d'adresses virtuelles (CR3 -> PTE/PDE)",
      "Détection des modules cachés hors InLoadOrderModuleList",
      "Interface en ligne de commande ultra-rapide avec dump hexadécimal"
    ],
    "repoUrl": "https://github.com/votre-user/kernel-memory-inspector",
    "demoUrl": "",
    "downloadUrl": "#",
    "instructions": "# Compilation avec WDK\nmsbuild /p:Configuration=Release /p:Platform=x64\n\n# Démarrage du service (mode TestSigning)\nsc create MemInspect type= kernel binPath= C:\\MemInspect.sys\nsc start MemInspect"
  },
  {
    "id": "indirect-syscall-engine",
    "title": "Moteur d'Appels Système Indirects",
    "category": "security",
    "categoryLabel": "Sécurité & Evasion",
    "status": "stable",
    "statusLabel": "Stable v2.1",
    "date": "2026-02",
    "shortDesc": "Bibliothèque C++20 pour exécuter des syscalls NT sans déclencher les alertes des agents de sécurité EDR.",
    "fullDesc": "Ce composant implémente les techniques Halo's Gate et Tartarus' Gate pour extraire dynamiquement les System Service Numbers (SSN) des fonctions ntdll, même si les premiers octets ont été crochetés par un antivirus. Les appels sautent ensuite vers des instructions syscall légitimes pour préserver une pile d'appels réaliste.",
    "tags": ["C++20", "Syscalls", "EDR Bypass", "x64"],
    "features": [
      "Résolution des fonctions par hachage ROR13 (zéro chaîne en clair)",
      "Détection automatique des hooks et recherche du SSN voisin",
      "Masquage du cadre de pile (callstack spoofing) vers ntdll",
      "Compatible Windows 10 et 11 toutes versions récentes"
    ],
    "repoUrl": "https://github.com/votre-user/indirect-syscall-engine",
    "demoUrl": "",
    "downloadUrl": "#",
    "instructions": "// Exemple d'utilisation dans vos projets\n#include \"syscalls.hpp\"\n\nPVOID allocBase = nullptr;\nSIZE_T allocSize = 0x1000;\nNtAllocateVirtualMemory((HANDLE)-1, &allocBase, 0, &allocSize, MEM_COMMIT, PAGE_READWRITE);"
  },
  {
    "id": "dxgi-present-hook-renderer",
    "title": "DirectX SwapChain Overlay Hook",
    "category": "game-dev",
    "categoryLabel": "Graphismes & Hooks",
    "status": "update",
    "statusLabel": "Mis à jour v3.0",
    "date": "2026-01",
    "shortDesc": "Intercepteur de flux DirectX 11/12 via VMT hooking pour injecter des overlays de débogage et télémétrie fluide.",
    "fullDesc": "Un moteur d'affichage discret conçu pour intégrer ImGui directement dans la boucle de rendu de jeux et applications graphiques DirectX. La table virtuelle de la SwapChain est résolue via la création d'un périphérique temporaire, évitant ainsi toute altération de mémoire suspecte.",
    "tags": ["C++", "DirectX 11", "DirectX 12", "ImGui"],
    "features": [
      "Compatible plein écran sans bordure et fenêtré",
      "Intégration transparente avec ImGui (docking & viewport)",
      "Gestion précise de la synchronisation verticale (VSync)",
      "Aucun hook invasif sur les fichiers du système"
    ],
    "repoUrl": "https://github.com/votre-user/dxgi-present-engine",
    "demoUrl": "",
    "downloadUrl": "#",
    "instructions": "// Hook de Present dans votre DLL\nIDXGISwapChain* swapChain = GetTargetSwapChain();\nInstallVMTHook(swapChain, 8 /* Present */, &hkPresent, &oPresent);"
  },
  {
    "id": "pe-pack-unpacker",
    "title": "Analyseur & Déballeur PE Automatisé",
    "category": "tools",
    "categoryLabel": "Outils & Analyse",
    "status": "beta",
    "statusLabel": "Bêta v0.9",
    "date": "2025-12",
    "shortDesc": "Outil Python utilisant l'émulateur Unicorn pour détecter le point d'entrée réel (OEP) et réparer l'IAT.",
    "fullDesc": "Un utilitaire développé pour automatiser le déballage d'exécutables protégés. Il lance une émulation du stub de déchiffrement, détecte les transitions de sections mémoire et reconstruit automatiquement la table d'adresses d'importation (IAT) pour faciliter l'analyse dans Ghidra ou IDA Pro.",
    "tags": ["Python", "Unicorn Engine", "Reverse", "PE Format"],
    "features": [
      "Émulation CPU x86/x64 sans exécution directe sur la machine",
      "Détection heuristique des sauts vers le véritable code cible",
      "Reconstruction automatique des imports corrompus",
      "Génération de rapports clairs au format JSON"
    ],
    "repoUrl": "https://github.com/votre-user/pe-unpacker-suite",
    "demoUrl": "",
    "downloadUrl": "#",
    "instructions": "python unpacker.py --input sample_obfuscated.exe --dump-oep --fix-iat"
  },
  {
    "id": "portfolio-cloud-vault",
    "title": "Ce Portfolio Personnel",
    "category": "web",
    "categoryLabel": "Web & Utilitaires",
    "status": "stable",
    "statusLabel": "En ligne",
    "date": "2026-04",
    "shortDesc": "Cette vitrine web conçue sur-mesure en HTML5/CSS3/Vanilla JS : légère, rapide et hébergeable gratuitement.",
    "fullDesc": "J'ai développé ce site pour centraliser tous mes projets personnels sans usine à gaz (aucun framework lourd, zéro temps de compilation). Il intègre un système de recherche instantané, des fiches détaillées avec extrait de code et un outil visuel pour ajouter de nouvelles créations en quelques clics.",
    "tags": ["HTML5", "CSS3", "JavaScript", "Zero-Dependency"],
    "features": [
      "Score de performance 100% sur Lighthouse (aucun bundle lourd)",
      "Design sombre équilibré et reposant pour les yeux",
      "Générateur intégré pour ajouter un projet et exporter le JSON",
      "Déployable en 1 clic sur GitHub Pages, Vercel ou Netlify"
    ],
    "repoUrl": "https://github.com/votre-user/mon-portfolio-perso",
    "demoUrl": "",
    "downloadUrl": "#",
    "instructions": "# Pour lancer le site en local\npython -m http.server 8080"
  }
];

class ProjectHubApp {
  constructor() {
    this.projects = [];
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'date-desc';

    // DOM Elements
    this.grid = document.getElementById('projects-grid');
    this.tabsContainer = document.getElementById('categories-tabs');
    this.searchInput = document.getElementById('search-input');
    this.searchClearBtn = document.getElementById('search-clear');
    this.sortSelect = document.getElementById('sort-select');
    this.countTotal = document.getElementById('metric-total');
    this.countCategories = document.getElementById('metric-categories');
    this.countLatest = document.getElementById('metric-latest');
    this.sectionCount = document.getElementById('section-count');

    // Modals
    this.detailModal = document.getElementById('detail-modal');
    this.addModal = document.getElementById('add-modal');
    this.addProjectForm = document.getElementById('add-project-form');

    this.init();
  }

  async init() {
    await this.loadProjects();
    this.setupEventListeners();
    this.renderTabs();
    this.render();
  }

  async loadProjects() {
    try {
      if (window.location.protocol.startsWith('http')) {
        const res = await fetch('projects.json?t=' + Date.now());
        if (res.ok) {
          this.projects = await res.json();
        } else {
          this.projects = DEFAULT_PROJECTS;
        }
      } else {
        this.projects = DEFAULT_PROJECTS;
      }
    } catch (e) {
      this.projects = DEFAULT_PROJECTS;
    }

    // Merge user additions from localStorage
    const localSaved = localStorage.getItem('hub_user_projects');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        parsed.forEach(item => {
          if (!this.projects.some(p => p.id === item.id)) {
            this.projects.unshift(item);
          }
        });
      } catch (err) {
        console.error(err);
      }
    }

    this.updateMetrics();
  }

  updateMetrics() {
    if (this.countTotal) this.countTotal.textContent = this.projects.length;
    
    const cats = new Set(this.projects.map(p => p.category));
    if (this.countCategories) this.countCategories.textContent = cats.size;

    if (this.countLatest && this.projects.length > 0) {
      const sorted = [...this.projects].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      this.countLatest.textContent = sorted[0].date ? sorted[0].date.slice(0, 4) : '2026';
    }
  }

  setupEventListeners() {
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      if (this.searchClearBtn) {
        this.searchClearBtn.classList.toggle('active', this.searchQuery.length > 0);
      }
      this.render();
    });

    this.searchClearBtn?.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClearBtn.classList.remove('active');
        this.render();
      }
    });

    this.sortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('modal-close')) {
          this.closeModals();
        }
      });
    });

    document.getElementById('btn-open-add')?.addEventListener('click', () => {
      this.openAddModal();
    });

    this.addProjectForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddProject();
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      this.exportProjectsJson();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModals();
    });
  }

  renderTabs() {
    if (!this.tabsContainer) return;

    const categoryMap = {
      'all': { label: 'All Projects', count: this.projects.length },
      'security': { label: 'Security & Systems', count: 0 },
      'game-dev': { label: 'Graphics & Engine', count: 0 },
      'tools': { label: 'Tools & Analysis', count: 0 },
      'web': { label: 'Web & Utilities', count: 0 }
    };

    this.projects.forEach(p => {
      const cat = p.category || 'tools';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { label: p.categoryLabel || cat, count: 0 };
      }
      categoryMap[cat].count++;
    });

    this.tabsContainer.innerHTML = '';
    Object.entries(categoryMap).forEach(([key, val]) => {
      const btn = document.createElement('button');
      btn.className = `cat-tab ${this.activeCategory === key ? 'active' : ''}`;
      btn.innerHTML = `${val.label} <span class="tab-count">${val.count}</span>`;
      btn.addEventListener('click', () => {
        this.activeCategory = key;
        document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
      this.tabsContainer.appendChild(btn);
    });
  }

  getFilteredProjects() {
    let list = this.projects.filter(p => {
      if (this.activeCategory !== 'all' && p.category !== this.activeCategory) {
        return false;
      }
      if (this.searchQuery) {
        const text = [
          p.title,
          p.shortDesc,
          p.fullDesc,
          ...(p.tags || []),
          p.categoryLabel
        ].join(' ').toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (this.sortBy === 'date-desc') {
        return (b.date || '').localeCompare(a.date || '');
      } else if (this.sortBy === 'date-asc') {
        return (a.date || '').localeCompare(b.date || '');
      } else if (this.sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }

  getGlyphForCategory(cat) {
    switch (cat) {
      case 'security':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      case 'game-dev':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m9-2h.01m3 0h.01"/></svg>`;
      case 'tools':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
      case 'web':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
      default:
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    }
  }

  render() {
    if (!this.grid) return;
    const items = this.getFilteredProjects();

    if (this.sectionCount) {
      this.sectionCount.textContent = `${items.length} ${items.length > 1 ? 'projects available' : 'project available'}`;
    }

    if (items.length === 0) {
      this.grid.innerHTML = `
        <div class="empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No projects match this search</h3>
          <p>Try different keywords or select a different category above.</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = items.map(p => this.createCardHTML(p)).join('');

    this.grid.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const project = this.projects.find(x => x.id === id);
        if (project) this.openDetailModal(project);
      });
    });
  }

  createCardHTML(p) {
    const statusClass = `badge-status-${p.status || 'stable'}`;
    const tagsHTML = (p.tags || []).slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('');
    const glyph = this.getGlyphForCategory(p.category);

    return `
      <article class="project-card" data-id="${p.id}">
        <div>
          <div class="card-top">
            <div class="card-glyph">${glyph}</div>
            <div class="badge-group">
              <span class="badge badge-category">${p.categoryLabel || p.category}</span>
              <span class="badge ${statusClass}">${p.statusLabel || p.status}</span>
            </div>
          </div>
          <h3 class="card-title">${p.title}</h3>
          <p class="card-desc">${p.shortDesc}</p>
          <div class="card-tags">${tagsHTML}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm btn-view-details" data-id="${p.id}">
            View Details &rarr;
          </button>
          ${p.repoUrl ? `
            <a href="${p.repoUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Voir le dépôt GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          ` : ''}
        </div>
      </article>
    `;
  }

  openDetailModal(p) {
    if (!this.detailModal) return;
    
    document.getElementById('modal-title').textContent = p.title;
    document.getElementById('modal-category').textContent = p.categoryLabel || p.category;
    document.getElementById('modal-status').textContent = p.statusLabel || p.status;
    document.getElementById('modal-desc').textContent = p.fullDesc || p.shortDesc;

    const featContainer = document.getElementById('modal-features');
    if (p.features && p.features.length > 0) {
      featContainer.innerHTML = p.features.map(f => `
        <li class="feature-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${f}</span>
        </li>
      `).join('');
      document.getElementById('modal-features-section').style.display = 'block';
    } else {
      document.getElementById('modal-features-section').style.display = 'none';
    }

    const codeContainer = document.getElementById('modal-code');
    if (p.instructions) {
      codeContainer.textContent = p.instructions;
      document.getElementById('modal-code-section').style.display = 'block';
    } else {
      document.getElementById('modal-code-section').style.display = 'none';
    }

    const btnRepo = document.getElementById('modal-btn-repo');
    const btnDemo = document.getElementById('modal-btn-demo');
    const btnDownload = document.getElementById('modal-btn-download');

    if (p.repoUrl) {
      btnRepo.href = p.repoUrl;
      btnRepo.style.display = 'inline-flex';
    } else {
      btnRepo.style.display = 'none';
    }

    if (p.demoUrl) {
      btnDemo.href = p.demoUrl;
      btnDemo.style.display = 'inline-flex';
    } else {
      btnDemo.style.display = 'none';
    }

    if (p.downloadUrl && p.downloadUrl !== '#') {
      btnDownload.href = p.downloadUrl;
      btnDownload.style.display = 'inline-flex';
    } else {
      btnDownload.style.display = 'none';
    }

    const copyBtn = document.getElementById('modal-code-copy');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(p.instructions || '');
        this.showToast('Code snippet copied!', 'success');
      };
    }

    this.detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  openAddModal() {
    if (!this.addModal) return;
    this.addModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }

  handleAddProject() {
    const title = document.getElementById('new-title').value.trim();
    const category = document.getElementById('new-category').value;
    const shortDesc = document.getElementById('new-short-desc').value.trim();
    const fullDesc = document.getElementById('new-full-desc').value.trim();
    const tagsRaw = document.getElementById('new-tags').value.trim();
    const featuresRaw = document.getElementById('new-features').value.trim();
    const repoUrl = document.getElementById('new-repo').value.trim();
    const demoUrl = document.getElementById('new-demo').value.trim();
    const instructions = document.getElementById('new-instructions').value.trim();

    const categoryLabels = {
      'security': 'Sécurité & Kernel',
      'game-dev': 'Graphismes & Hooks',
      'tools': 'Outils & Analyse',
      'web': 'Web & Utilitaires'
    };

    const newProject = {
      id: 'proj-' + Date.now().toString(36),
      title: title,
      category: category,
      categoryLabel: categoryLabels[category] || category,
      status: 'stable',
      statusLabel: 'Nouveau',
      date: new Date().toISOString().slice(0, 7),
      shortDesc: shortDesc,
      fullDesc: fullDesc || shortDesc,
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : ['Perso'],
      features: featuresRaw ? featuresRaw.split('\n').map(f => f.trim()).filter(Boolean) : [],
      repoUrl: repoUrl,
      demoUrl: demoUrl,
      downloadUrl: '#',
      instructions: instructions
    };

    this.projects.unshift(newProject);

    const localSaved = JSON.parse(localStorage.getItem('hub_user_projects') || '[]');
    localSaved.unshift(newProject);
    localStorage.setItem('hub_user_projects', JSON.stringify(localSaved));

    this.showToast(`Projet "${title}" ajouté avec succès !`, 'success');
    this.addProjectForm.reset();
    this.closeModals();
    this.updateMetrics();
    this.renderTabs();
    this.render();
  }

  exportProjectsJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.projects, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "projects.json");
    dlAnchorElem.click();
    this.showToast("Fichier projects.json téléchargé !", 'info');
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' 
          ? '<polyline points="20 6 9 17 4 12"></polyline>' 
          : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.hubApp = new ProjectHubApp();
});
