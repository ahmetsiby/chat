const pool = require("../config/database");

// Trouver un utilisateur par nom d'utilisateur
exports.findByUsername = async (username) => {
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return result.rows[0];
};

// Insérer un nouvel utilisateur dans la base de données
exports.createUser = async (username, hashedPassword) => {
  await pool.query(
    "INSERT INTO users (username, password, is_approved) VALUES ($1, $2, $3)",
    [username, hashedPassword, false]
  );
};

// Approuver un utilisateur
exports.approveUser = async (userId) => {
  await pool.query("UPDATE users SET is_approved = true WHERE id = $1", [
    userId,
  ]);
};

// Récupérer tous les utilisateurs en attente d'approbation
exports.getPendingUsers = async () => {
  const result = await pool.query(
    "SELECT * FROM users WHERE is_approved = false"
  );
  return result.rows;
};
//recupere tous les users
exports.getAllUser = async () => {
  const result = await pool.query("SELECT * FROM users");
  return result.rows;
};

// Supprimer un utilisateur
// Supprimer un utilisateur
exports.deleteUser = async (userId) => {
  const Id = parseInt(userId, 10);
  if (isNaN(Id)) {
    throw new Error("Invalid user ID");
  }
  await pool.query("DELETE FROM users WHERE id = $1", [Id]);
  return "User supprimé";
};
