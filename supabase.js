// ─────────────────────────────────────────────
//  AGENT PLATFORM — SUPABASE CLIENT
// ─────────────────────────────────────────────

if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
  throw new Error('Supabase CDN failed to load — check network or CDN URL');
}
const _supabase = supabase.createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.anonKey
);

const DB = {
  client: _supabase,

  // ── Auth ──────────────────────────────────────
  auth: {
    async signIn(email, password) {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      await _supabase.auth.signOut();
      window.location.href = '/login.html';
    },
    async getSession() {
      const { data } = await _supabase.auth.getSession();
      return data.session;
    },
    async getUser() {
      const { data } = await _supabase.auth.getUser();
      return data.user;
    },
    onAuthChange(callback) {
      return _supabase.auth.onAuthStateChange(callback);
    },
  },

  // ── Session guard — call at top of every page ──
  async requireAuth() {
    document.body.style.visibility = 'hidden';
    const session = await DB.auth.getSession();
    if (!session) {
      window.location.href = '/login.html';
      return null;
    }
    document.body.style.visibility = '';
    return session;
  },

  // ── Current user + role ───────────────────────
  async getCurrentUser() {
    const user = await DB.auth.getUser();
    if (!user) return null;
    const { data } = await _supabase
      .from('users')
      .select('*, project_members(role, project_id)')
      .eq('id', user.id)
      .single();
    return data;
  },

  async getUserRole(projectId) {
    const user = await DB.auth.getUser();
    if (!user) return null;
    const { data } = await _supabase
      .from('project_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();
    return data?.role || null;
  },

  // ── Projects ──────────────────────────────────
  projects: {
    async list() {
      const user = await DB.auth.getUser();
      const { data } = await _supabase
        .from('projects')
        .select('*, project_members!inner(role)')
        .eq('project_members.user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    async get(id) {
      const { data } = await _supabase.from('projects').select('*').eq('id', id).single();
      return data;
    },
    async create(payload) {
      const user = await DB.auth.getUser();
      const { data, error } = await _supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      await _supabase.from('project_members').insert({ project_id: data.id, user_id: user.id, role: 'admin' });
      return data;
    },
    async update(id, payload) {
      const { data, error } = await _supabase.from('projects').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
  },

  // ── Stories ───────────────────────────────────
  stories: {
    async list(projectId, filters = {}) {
      let q = _supabase.from('user_stories').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.feature) q = q.ilike('feature_name', `%${filters.feature}%`);
      const { data } = await q;
      return data || [];
    },
    async get(id) {
      const { data } = await _supabase.from('user_stories').select('*, story_versions(*)').eq('id', id).single();
      return data;
    },
    async create(payload) {
      const { data, error } = await _supabase.from('user_stories').insert(payload).select().single();
      if (error) throw error;
      await DB.activity.log(payload.project_id, 'story_created', `Story "${payload.title}" created`);
      return data;
    },
    async update(id, payload) {
      const existing = await DB.stories.get(id);
      if (existing) {
        await _supabase.from('story_versions').insert({
          story_id: id,
          version: existing.version,
          story_text: existing.story_text,
          acceptance_criteria: existing.acceptance_criteria,
          changed_by: (await DB.auth.getUser()).id,
        });
      }
      const { data, error } = await _supabase.from('user_stories').update({ ...payload, version: (existing?.version || 1) + 1 }).eq('id', id).select().single();
      if (error) throw error;
      await DB.activity.log(existing.project_id, 'story_updated', `Story "${existing.title}" updated to v${data.version}`);
      return data;
    },
    async updateStatus(id, status) {
      const { data, error } = await _supabase.from('user_stories').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      await DB.activity.log(data.project_id, 'story_status', `Story "${data.title}" → ${status}`);
      return data;
    },
    async bulkUpdateStatus(ids, status) {
      const { data, error } = await _supabase.from('user_stories').update({ status }).in('id', ids).select();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await _supabase.from('user_stories').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ── Comments ──────────────────────────────────
  comments: {
    async list(storyId) {
      const { data } = await _supabase.from('story_comments').select('*, users(full_name)').eq('story_id', storyId).order('created_at');
      return data || [];
    },
    async add(storyId, text) {
      const user = await DB.auth.getUser();
      const { data, error } = await _supabase.from('story_comments').insert({ story_id: storyId, user_id: user.id, text }).select('*, users(full_name)').single();
      if (error) throw error;
      return data;
    },
  },

  // ── Test cases ────────────────────────────────
  testCases: {
    async list(projectId, storyId = null) {
      let q = _supabase.from('test_cases').select('*').eq('project_id', projectId).order('created_at');
      if (storyId) q = q.eq('story_id', storyId);
      const { data } = await q;
      return data || [];
    },
    async create(payload) {
      const { data, error } = await _supabase.from('test_cases').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async bulkCreate(tests) {
      const { data, error } = await _supabase.from('test_cases').insert(tests).select();
      if (error) throw error;
      return data;
    },
  },

  // ── UAT ───────────────────────────────────────
  uat: {
    async createSession(payload) {
      const { data, error } = await _supabase.from('uat_sessions').insert(payload).select().single();
      if (error) throw error;
      await DB.activity.log(payload.project_id, 'uat_started', `UAT session "${payload.name}" started`);
      return data;
    },
    async getSessions(projectId) {
      const { data } = await _supabase.from('uat_sessions').select('*, uat_results(*)').eq('project_id', projectId).order('created_at', { ascending: false });
      return data || [];
    },
    async logResult(payload) {
      const { data, error } = await _supabase.from('uat_results').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async signOff(sessionId, projectId) {
      const user = await DB.auth.getUser();
      const { data, error } = await _supabase.from('uat_sessions').update({ status: 'signed_off', signed_off_by: user.id, signed_off_at: new Date().toISOString() }).eq('id', sessionId).select().single();
      if (error) throw error;
      await DB.activity.log(projectId, 'uat_signed_off', `UAT session signed off`);
      return data;
    },
  },

  // ── Defects ───────────────────────────────────
  defects: {
    async list(projectId) {
      const { data } = await _supabase.from('defects').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      return data || [];
    },
    async create(payload) {
      const { data, error } = await _supabase.from('defects').insert(payload).select().single();
      if (error) throw error;
      await DB.activity.log(payload.project_id, 'defect_raised', `Defect "${payload.title}" raised`);
      return data;
    },
    async update(id, payload) {
      const { data, error } = await _supabase.from('defects').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
  },

  // ── Risks ─────────────────────────────────────
  risks: {
    async list(projectId) {
      const { data } = await _supabase.from('risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      return data || [];
    },
    async create(payload) {
      const { data, error } = await _supabase.from('risks').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async update(id, payload) {
      const { data, error } = await _supabase.from('risks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
  },

  // ── Releases & Phases ─────────────────────────
  releases: {
    async listPhases(projectId) {
      const { data } = await _supabase.from('phases').select('*, releases(*)').eq('project_id', projectId).order('created_at');
      return data || [];
    },
    async createPhase(payload) {
      const { data, error } = await _supabase.from('phases').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async createRelease(payload) {
      const { data, error } = await _supabase.from('releases').insert(payload).select().single();
      if (error) throw error;
      await DB.activity.log(payload.project_id, 'release_created', `Release "${payload.name}" created`);
      return data;
    },
    async tagStories(releaseId, storyIds) {
      const rows = storyIds.map(sid => ({ release_id: releaseId, story_id: sid }));
      const { error } = await _supabase.from('story_release_map').upsert(rows);
      if (error) throw error;
    },
  },

  // ── Knowledge base ────────────────────────────
  knowledge: {
    async list(projectId) {
      const { data } = await _supabase.from('knowledge_docs').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      return data || [];
    },
    async add(payload) {
      const { data, error } = await _supabase.from('knowledge_docs').insert(payload).select().single();
      if (error) throw error;
      await DB.activity.log(payload.project_id, 'knowledge_added', `Document "${payload.title}" added to knowledge base`);
      return data;
    },
    async delete(id) {
      const { error } = await _supabase.from('knowledge_docs').delete().eq('id', id);
      if (error) throw error;
    },
    async search(projectId, query) {
      const { data } = await _supabase.from('knowledge_docs').select('*').eq('project_id', projectId).or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(10);
      return data || [];
    },
  },

  // ── Agent config ──────────────────────────────
  agentConfig: {
    async get(projectId) {
      const { data } = await _supabase.from('project_agent_config').select('*').eq('project_id', projectId).single();
      return data;
    },
    async save(projectId, payload) {
      const { data, error } = await _supabase.from('project_agent_config').upsert({ project_id: projectId, ...payload }).select().single();
      if (error) throw error;
      return data;
    },
  },

  // ── Team members ──────────────────────────────
  team: {
    async list(projectId) {
      const { data } = await _supabase.from('project_members').select('*, users(full_name, email)').eq('project_id', projectId);
      return data || [];
    },
    async add(projectId, userId, role) {
      const { data, error } = await _supabase.from('project_members').insert({ project_id: projectId, user_id: userId, role }).select().single();
      if (error) throw error;
      return data;
    },
    async updateRole(projectId, userId, role) {
      const { data, error } = await _supabase.from('project_members').update({ role }).eq('project_id', projectId).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    },
    async remove(projectId, userId) {
      const { error } = await _supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
      if (error) throw error;
    },
    async listAllUsers() {
      const { data } = await _supabase.from('users').select('id, full_name, email').order('full_name');
      return data || [];
    },
  },

  // ── Activity log ──────────────────────────────
  activity: {
    async log(projectId, type, description) {
      const user = await DB.auth.getUser();
      await _supabase.from('activity_log').insert({ project_id: projectId, user_id: user?.id, type, description });
    },
    async list(projectId, limit = 50) {
      const { data } = await _supabase.from('activity_log').select('*, users(full_name)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit);
      return data || [];
    },
  },
};
