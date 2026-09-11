process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-not-a-dev-default-value";
process.env.ADMIN_SIGNUP_CODE = "admin-test-code";
process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/placecell_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
