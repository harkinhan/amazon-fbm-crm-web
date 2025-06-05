export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
  dbPath: process.env.DB_PATH || './database.sqlite',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  nodeEnv: process.env.NODE_ENV || 'development'
}; 