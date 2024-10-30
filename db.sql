CREATE TABLE ideas (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID
    email VARCHAR(255) NOT NULL,  -- Email of the submitter
    idea TEXT NOT NULL,  -- The idea description
    description TEXT NOT NULL,  -- Additional description for the idea
    technologies TEXT NOT NULL,  -- Technologies used to bring the idea to life
    votes INT DEFAULT 0,  -- Vote count, defaulting to 0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Auto-generated creation timestamp
    updated_at TIMESTAMP DEFAULT NULL  -- Timestamp for last update, can be NULL initially
);

CREATE TABLE votes (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID for the vote entry
    user_email VARCHAR(255) NOT NULL,  -- Email of the user who voted
    idea_id INT NOT NULL,  -- ID of the idea being voted for
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp for when the vote was made
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE  -- Ensure referential integrity
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

