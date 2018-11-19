const tk = require('timekeeper');
const expect = require('chai').expect;

module.exports = () => ({
  freeze: (timestamp) => {
    expect(tk.isKeepingTime()).to.equal(false);
    tk.freeze(new Date(timestamp * 1000));
  },
  unfreeze: () => {
    if (tk.isKeepingTime()) {
      tk.reset();
    }
  }
});
