// Always returns a trimmed string (blocks NoSQL operator objects such as {"$gt": ""})
exports.str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.safeCell = (v) => (typeof v === 'string' ? v.replace(/^[=+\-@]+/, '') : v);
