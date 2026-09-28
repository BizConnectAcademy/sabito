const state = {
  adminKey: sessionStorage.getItem('sabito_admin_key') || '',
  projects: [],
  slugEdited: false,
};

const byId = (id) => document.getElementById(id);
const loginView = byId('login-view');
const dashboardView = byId('dashboard-view');
const grid = byId('project-grid');
const emptyState = byId('empty-state');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-admin-key': state.adminKey,
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({
    success: false,
    message: 'Sabito returned an unreadable response.',
  }));
  if (!response.ok) {
    const error = new Error(body.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function setSignedIn(signedIn) {
  loginView.classList.toggle('hidden', signedIn);
  dashboardView.classList.toggle('hidden', !signedIn);
}

function showNotice(message, kind = 'success') {
  const notice = byId('dashboard-message');
  notice.textContent = message;
  notice.className = `notice ${kind}`;
  window.setTimeout(() => notice.classList.add('hidden'), 5000);
}

function actionButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.addEventListener('click', onClick);
  return button;
}

function renderProjects() {
  grid.replaceChildren();
  emptyState.classList.toggle('hidden', state.projects.length > 0);

  for (const project of state.projects) {
    const card = document.createElement('article');
    card.className = 'project-card';

    const top = document.createElement('div');
    top.className = 'project-top';
    const mark = document.createElement('span');
    mark.className = 'project-mark';
    mark.textContent = project.name.slice(0, 1).toUpperCase();
    const identity = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = project.name;
    const slug = document.createElement('code');
    slug.textContent = project.slug;
    identity.append(title, slug);
    const badge = document.createElement('span');
    badge.className = `badge ${project.status}`;
    badge.textContent = project.status;
    top.append(mark, identity, badge);

    const meta = document.createElement('dl');
    const assistantLabel = document.createElement('dt');
    assistantLabel.textContent = 'Assistant';
    const assistant = document.createElement('dd');
    assistant.textContent = project.assistantName;
    const idLabel = document.createElement('dt');
    idLabel.textContent = 'Project ID';
    const id = document.createElement('dd');
    id.textContent = project.id;
    meta.append(assistantLabel, assistant, idLabel, id);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      actionButton('Add knowledge', '', () => openKnowledge(project)),
      actionButton('Rotate secret', 'secondary', () => rotateSecret(project)),
    );
    card.append(top, meta, actions);
    grid.append(card);
  }
}

async function loadProjects() {
  const result = await api('/v1/admin/projects');
  state.projects = result.data;
  renderProjects();
  setSignedIn(true);
}

function displayCredentials(credentials) {
  byId('credential-id').textContent = credentials.clientId;
  byId('credential-secret').textContent = credentials.clientSecret;
  byId('credentials-dialog').showModal();
}

function openKnowledge(project) {
  byId('knowledge-project-id').value = project.id;
  byId('knowledge-project-name').textContent = `Project: ${project.name}`;
  byId('knowledge-title').value = '';
  byId('knowledge-content').value = '';
  byId('knowledge-error').textContent = '';
  byId('knowledge-dialog').showModal();
}

async function rotateSecret(project) {
  if (!window.confirm(`Rotate credentials for ${project.name}? The current credentials will stop working immediately.`)) return;
  try {
    const result = await api(`/v1/admin/projects/${project.id}/credentials/rotate`, {
      method: 'POST',
      body: '{}',
    });
    displayCredentials(result.data);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

byId('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = byId('login-error');
  error.textContent = '';
  state.adminKey = byId('admin-key').value;
  try {
    await loadProjects();
    sessionStorage.setItem('sabito_admin_key', state.adminKey);
    byId('admin-key').value = '';
  } catch (requestError) {
    state.adminKey = '';
    error.textContent = requestError.status === 401
      ? 'That administrator key is not valid.'
      : requestError.message;
  }
});

byId('new-project-button').addEventListener('click', () => {
  state.slugEdited = false;
  byId('project-form').reset();
  byId('assistant-name').value = 'Sabito';
  byId('system-prompt').value = 'You are Sabito, the official platform assistant. Answer only from approved project knowledge. If the answer is not present, say that you do not know.';
  byId('project-error').textContent = '';
  byId('project-dialog').showModal();
});

byId('project-name').addEventListener('input', (event) => {
  if (state.slugEdited) return;
  byId('project-slug').value = event.target.value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
});
byId('project-slug').addEventListener('input', () => { state.slugEdited = true; });

byId('project-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = byId('project-error');
  error.textContent = '';
  try {
    const result = await api('/v1/admin/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: byId('project-name').value,
        slug: byId('project-slug').value,
        assistant_name: byId('assistant-name').value,
        system_prompt: byId('system-prompt').value,
      }),
    });
    byId('project-dialog').close();
    displayCredentials(result.data.credentials);
    await loadProjects();
  } catch (requestError) {
    error.textContent = requestError.message;
  }
});

byId('knowledge-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = byId('knowledge-error');
  error.textContent = '';
  const projectId = byId('knowledge-project-id').value;
  try {
    const result = await api(`/v1/admin/projects/${projectId}/knowledge`, {
      method: 'POST',
      body: JSON.stringify({
        title: byId('knowledge-title').value,
        content: byId('knowledge-content').value,
      }),
    });
    byId('knowledge-dialog').close();
    showNotice(`Knowledge indexed in ${result.data.chunks} chunk(s).`);
  } catch (requestError) {
    error.textContent = requestError.message;
  }
});

byId('refresh-button').addEventListener('click', () => {
  loadProjects().catch((error) => showNotice(error.message, 'error'));
});
byId('logout-button').addEventListener('click', () => {
  state.adminKey = '';
  state.projects = [];
  sessionStorage.removeItem('sabito_admin_key');
  setSignedIn(false);
});

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => byId(button.dataset.close).close());
});
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(byId(button.dataset.copy).textContent);
    const original = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = original; }, 1200);
  });
});

if (state.adminKey) {
  loadProjects().catch(() => {
    sessionStorage.removeItem('sabito_admin_key');
    state.adminKey = '';
    setSignedIn(false);
  });
}
