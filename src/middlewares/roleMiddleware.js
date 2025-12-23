export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized, user not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Not allowed role." });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: "Server error in role middleware" });
    }
  };
};
