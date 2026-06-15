// ─────────────────────────────────────────────
//  AGENT PLATFORM — NAVIGATION
//  Inject into every page via: Nav.init()
// ─────────────────────────────────────────────

const Nav = {
  currentProject: null,
  currentUser: null,
  userRole: null,

  async init() {
    await DB.requireAuth();
    this.currentUser = await DB.getCurrentUser();
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      this.currentProject = await DB.projects.get(projectId);
      this.userRole = await DB.getUserRole(projectId);
    }
    this.render();
    this.highlightActive();
  },

  setProject(project) {
    this.currentProject = project;
    localStorage.setItem('currentProjectId', project.id);
    this.render();
  },

  can(action) {
    const role = this.userRole;
    const permissions = {
      admin:    ['view','edit','approve','delete','settings','invite'],
      approver: ['view','edit','approve'],
      editor:   ['view','edit'],
      viewer:   ['view'],
    };
    return (permissions[role] || []).includes(action);
  },

  render() {
    const existing = document.getElementById('ap-nav');
    if (existing) existing.remove();

    const nav = document.createElement('div');
    nav.id = 'ap-nav';
    nav.innerHTML = `
      <style>
        #ap-nav {
          position: fixed; left: 0; top: 0; bottom: 0; width: 220px;
          background: #0f1117; color: #c9c7be; display: flex;
          flex-direction: column; z-index: 100; font-family: system-ui, sans-serif;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        #ap-nav .nav-logo {
          padding: 20px 18px 16px;
          font-size: 15px; font-weight: 600; color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          letter-spacing: -0.3px;
        }
        #ap-nav .nav-logo span { color: #5DCAA5; }
        #ap-nav .project-switcher {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        #ap-nav .project-switcher select {
          width: 100%; background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          color: #c9c7be; padding: 7px 10px; font-size: 12px;
          cursor: pointer; outline: none;
        }
        #ap-nav .nav-links { flex: 1; padding: 10px 0; overflow-y: auto; }
        #ap-nav .nav-section { padding: 14px 18px 4px; font-size: 10px;
          font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase;
          letter-spacing: .08em; }
        #ap-nav .nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 18px; font-size: 13px; color: rgba(255,255,255,0.55);
          text-decoration: none; transition: all .15s; border-radius: 0;
          cursor: pointer; border: none; background: none; width: 100%; text-align: left;
        }
        #ap-nav .nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
        #ap-nav .nav-link.active { color: #fff; background: rgba(93,202,165,0.15);
          border-left: 2px solid #5DCAA5; padding-left: 16px; }
        #ap-nav .nav-link i { font-size: 16px; width: 18px; }
        #ap-nav .nav-footer {
          padding: 14px 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        #ap-nav .nav-user { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 10px; }
        #ap-nav .nav-user strong { color: rgba(255,255,255,0.8); display: block; font-size: 13px; }
        #ap-nav .nav-role { display: inline-block; font-size: 10px; font-weight: 600;
          padding: 1px 7px; border-radius: 3px; margin-top: 3px;
          background: rgba(93,202,165,0.2); color: #5DCAA5; text-transform: uppercase; }
        #ap-nav .btn-logout {
          width: 100%; padding: 7px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer;
          transition: all .15s;
        }
        #ap-nav .btn-logout:hover { background: rgba(255,255,255,0.1); color: #fff; }
        body { margin-left: 220px; }
      </style>

      <div class="nav-logo">Agent<span>Platform</span></div>

      <div class="project-switcher">
        <select id="nav-project-select" onchange="Nav.switchProject(this.value)">
          <option value="">Select project…</option>
        </select>
      </div>

      <div class="nav-links">
        <div class="nav-section">Overview</div>
        <a class="nav-link" href="/index.html" data-page="index">
          <i class="ti ti-layout-dashboard"></i> Dashboard
        </a>
        <a class="nav-link" href="/activity.html" data-page="activity">
          <i class="ti ti-activity"></i> Activity log
        </a>

        <div class="nav-section">Requirements</div>
        <a class="nav-link" href="/knowledge.html" data-page="knowledge">
          <i class="ti ti-books"></i> Knowledge base
        </a>
        <a class="nav-link" href="/stories.html" data-page="stories">
          <i class="ti ti-file-text"></i> User stories
        </a>
        <a class="nav-link" href="/risks.html" data-page="risks">
          <i class="ti ti-alert-triangle"></i> Risk radar
        </a>

        <div class="nav-section">Quality</div>
        <a class="nav-link" href="/tests.html" data-page="tests">
          <i class="ti ti-checkbox"></i> Test cases & UAT
        </a>

        <div class="nav-section">Delivery</div>
        <a class="nav-link" href="/releases.html" data-page="releases">
          <i class="ti ti-rocket"></i> Releases
        </a>

        ${this.can('settings') ? `
        <div class="nav-section">Admin</div>
        <a class="nav-link" href="/settings.html" data-page="settings">
          <i class="ti ti-settings"></i> Settings
        </a>` : ''}
      </div>

      <div class="nav-footer">
        <div class="nav-user">
          <strong>${this.currentUser?.full_name || this.currentUser?.email || 'User'}</strong>
          ${this.userRole ? `<span class="nav-role">${this.userRole}</span>` : ''}
        </div>
        <button class="btn-logout" onclick="DB.auth.signOut()">
          <i class="ti ti-logout"></i> Sign out
        </button>
      </div>
    `;

    document.body.prepend(nav);
    this.loadProjects();
  },

  async loadProjects() {
    const projects = await DB.projects.list();
    const select = document.getElementById('nav-project-select');
    if (!select) return;
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (this.currentProject?.id === p.id) opt.selected = true;
      select.appendChild(opt);
    });
  },

  async switchProject(projectId) {
    if (!projectId) return;
    const project = await DB.projects.get(projectId);
    this.setProject(project);
    window.location.reload();
  },

  highlightActive() {
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    document.querySelectorAll('#ap-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
  },
};
