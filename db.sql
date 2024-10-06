CREATE TABLE ideas (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  idea TEXT NOT NULL,
  description TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP  -- No default value, remains NULL unless updated
);
