const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || '';

		if (!authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				success: false,
				message: 'Authorization token missing',
			});
		}

		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');

		req.user = decoded;
		return next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: 'Invalid or expired token',
		});
	}
};

const requireRole = (...roles) => (req, res, next) => {
	const userRole = req.user?.role;
	if (!userRole || !roles.includes(userRole)) {
		return res.status(403).json({
			success: false,
			message: 'Access denied',
		});
	}

	return next();
};

module.exports = { verifyToken, requireRole };
