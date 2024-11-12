CREATE TABLE ideas (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID
    email VARCHAR(255) NOT NULL,  -- Email of the submitter
    idea TEXT NOT NULL,  -- The idea description
    description TEXT NOT NULL,  -- Additional description for the idea
    technologies TEXT NOT NULL,  -- Technologies used to bring the idea to life
    likes INT DEFAULT 0,  -- Like count, defaulting to 0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Auto-generated creation timestamp
    updated_at TIMESTAMP DEFAULT NULL,  -- Timestamp for last update, can be NULL initially
    event_id INT REFERENCES events(id) ON DELETE CASCADE  -- Foreign key to events table
);

CREATE TABLE likes (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID for the like entry
    user_email VARCHAR(255) NOT NULL,  -- Email of the user who liked
    idea_id INT NOT NULL,  -- ID of the idea being liked
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp for when the like was made
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE  -- Ensure referential integrity
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin (
    email VARCHAR(255) PRIMARY KEY
);


