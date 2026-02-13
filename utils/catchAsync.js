module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // 👈 next must be passed and used
  };
};
