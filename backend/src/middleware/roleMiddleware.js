export const allowRoles = (...roles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated."
            });
        }

        console.log(`[allowRoles] User Email: ${req.user.email}, Role: ${req.user.role}, Allowed Roles: [${roles.join(", ")}]`);

        if (!roles.includes(req.user.role)) {
            console.log(`[allowRoles] Access Denied: User role ${req.user.role} not in allowed list [${roles.join(", ")}]`);
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource."
            });
        }

        next();
    };
};

export const adminOnly = allowRoles("admin");
export const scannerAccess = allowRoles("admin", "scanner");