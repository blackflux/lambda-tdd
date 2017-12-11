module.exports = (e) => {
  if (typeof e === 'string' || e instanceof String) {
    return e;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return JSON.stringify(e);
};
