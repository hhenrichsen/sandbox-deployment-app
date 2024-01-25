import postgres from "postgres";

export class DatabaseConnection {
  private connection = postgres();

  // This is very bad and I should feel bad. Please don't do this in production.
  public migrate() {
    return this.connection`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(256) UNIQUE NOT NULL,
        token VARCHAR(16) UNIQUE NOT NULL,
        image_url TEXT
    );`;
  }

  public async register(name: string) {
    const token = Math.random().toString(36).substring(2);
    await this.connection`
      INSERT INTO users (username, token)
      VALUES (${name}, ${token});
    `;
    return this.connection`
      SELECT token FROM users WHERE username = ${name};
    `;
  }

  public getUserByToken(token: string) {
    return this
      .connection`SELECT id, username, image_url FROM tokens WHERE token = ${token}`;
  }

  public getUserById(id: number) {
    return this
      .connection`SELECT id, username, image_url FROM users WHERE username = ${id}`;
  }

  public setUserImageByToken(token: string, imageUrl: string) {
    return this.connection`
      UPDATE users
      SET image_url = ${imageUrl}
      WHERE token = ${token};
    `;
  }

  public getUserImage(username: string) {
    return this
      .connection`SELECT image_url FROM users WHERE username = ${username}`;
  }
}
