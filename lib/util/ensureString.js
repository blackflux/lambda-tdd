module.exports = e => (typeof e === 'string' || e instanceof String ? e : JSON.stringify(e));
