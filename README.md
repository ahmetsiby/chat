Voici le fichier

README.md

mis à jour avec les extraits de code fournis :

````markdown
# Chat App

## Description

Chat App est une application de chat en temps réel permettant aux utilisateurs de se connecter, d'envoyer des messages, de partager des fichiers et de gérer les utilisateurs via une interface d'administration. L'application utilise Express.js pour le serveur web et Socket.io pour la communication en temps réel.

## Installation

1. Clonez le dépôt :
   ```bash
   git clone <URL_DU_DEPOT>
   cd <NOM_DU_REPERTOIRE>
   ```
````

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Configurez les variables d'environnement dans un fichier `.env` :

   ```plaintext
   PORT=4000
   PUBLIC_VAPID_KEY=<votre_public_vapid_key>
   PRIVATE_VAPID_KEY=<votre_private_vapid_key>
   ```

4. Démarrez le serveur :
   ```bash
   npm start
   ```

## Paquets à installer

- **express** (version 4.17.1) : Framework web pour Node.js.
  ```bash
  npm install express@4.17.1
  ```
- **express-session** (version 1.17.1) : Middleware pour gérer les sessions.
  ```bash
  npm install express-session@1.17.1
  ```
- **connect-flash** (version 0.1.1) : Middleware pour les messages flash (notifications).
  ```bash
  npm install connect-flash@0.1.1
  ```
- **web-push** (version 3.4.4) : Bibliothèque pour les notifications push.
  ```bash
  npm install web-push@3.4.4
  ```
- **body-parser** (version 1.19.0) : Middleware pour parser les corps de requêtes HTTP.
  ```bash
  npm install body-parser@1.19.0
  ```
- **path** (version 0.12.7) : Module pour travailler avec les chemins de fichiers et de répertoires.
  ```bash
  npm install path@0.12.7
  ```
- **dotenv** (version 8.2.0) : Module pour charger les variables d'environnement à partir d'un fichier `.env`.
  ```bash
  npm install dotenv@8.2.0
  ```
- **socket.io** (version 2.3.0) : Bibliothèque pour la communication en temps réel via WebSocket.
  ```bash
  npm install socket.io@2.3.0
  ```

## Routes

### Routes publiques

- **GET `/`** : Affiche la page d'accueil de l'application de chat.

### Routes d'administration

- **GET `/admin`** : Affiche la page d'administration.
- **POST `/admin/approve/:id`** : Approuve un utilisateur.
- **POST `/admin/delete/:id`** : Supprime un utilisateur.
- **POST `/admin/remove/:id`** : Retire un utilisateur.

## WebSocket (Socket.io)

### Événements

- **`connection`** : Événement déclenché lorsqu'un utilisateur se connecte.
  - **`user connected`** : Réception de l'utilisateur qui rejoint le chat.
    - **Paramètres** :
      - `username` : Nom d'utilisateur.
      - `isActive` : État de l'utilisateur (actif ou non).
  - **`user activity`** : Gère l'état de l'utilisateur.
    - **Paramètres** :
      - `isActive` : État de l'utilisateur (actif ou non).
  - **`file-upload`** : Réception des fichiers.
    - **Paramètres** :
      - `data` : Données du fichier.
  - **`chat message`** : Réception d'un message de chat.
    - **Paramètres** :
      - `msg` : Message de chat.
  - **`disconnect`** : Gère la déconnexion de l'utilisateur.

### Extraits de code

#### Routes admin

```javascript
// Routes admin
app.get("/admin", adminController.showAdminPage);
app.post("/admin/approve/:id", adminController.approveUser);
app.post("/admin/delete/:id", adminController.deleteUser);
app.post("/admin/remove/:id", adminController.removeUser);
```

#### Gérer les utilisateurs connectés

```javascript
// Gérer les utilisateurs connectés
const connectedUsers = {};
```

#### WebSocket (Socket.io)

```javascript
// WebSocket (Socket.io)
io.on("connection", async (socket) => {
  // Réception de l'utilisateur qui rejoint le chat
  socket.on("user connected", async (username, isActive) => {});

  // Gérer l'état de l'utilisateur
  socket.on("user activity", (isActive) => {});

  // Réception des fichiers
  socket.on("file-upload", (data) => {});

  // Réception d'un message de chat
  socket.on("chat message", (msg) => {});

  // Gérer la déconnexion
  socket.on("disconnect", async () => {});
});
```

#### Fonction de séparation des utilisateurs connectés et non connectés

```javascript
// Fonction de séparation des utilisateurs connectés et non connectés
async function getSeparateUsers() {}
```

#### Démarrage du serveur

```javascript
// Démarrer le serveur
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

## Conclusion

Cette documentation couvre les principales fonctionnalités et configurations de votre application de chat. Assurez-vous de configurer correctement les variables d'environnement et de suivre les étapes d'installation pour démarrer le serveur.

```

```
