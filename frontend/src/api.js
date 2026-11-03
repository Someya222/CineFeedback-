async function request(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('cf_token');
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, 'POST', b || {}),
  put: (p, b) => request(p, 'PUT', b || {}),
  patch: (p, b) => request(p, 'PATCH', b || {}),
  del: (p) => request(p, 'DELETE'),
};

// Downloads a protected file (PDF / Excel) using the login token
export async function download(path, filename) {
  const res = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + localStorage.getItem('cf_token') } });
  if (!res.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
