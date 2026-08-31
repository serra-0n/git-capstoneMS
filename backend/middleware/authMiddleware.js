const jwt = require("jsonwebtoken");

function authenticateUser(request, response, next) {
    const authorization = request.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return response.status(401).json({
            message: "Authentication is required."
        });
    }

    const token = authorization.slice(7);

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        request.user = {
            id: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role
        };

        next();
    } catch (error) {
        return response.status(401).json({
            message: "Your session is invalid or expired."
        });
    }
}

function requireRole(...allowedRoles) {
    return function roleMiddleware(request, response, next) {
        if (!allowedRoles.includes(request.user?.role)) {
            return response.status(403).json({
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}

module.exports = {
    authenticateUser,
    requireRole
};