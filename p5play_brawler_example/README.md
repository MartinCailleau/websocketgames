# 🎮 Mini-jeu multijoueur – p5play + WebSocket

Exemple pédagogique d'un jeu multijoueur en temps réel.  
Chaque joueur contrôle une balle depuis son téléphone, la balle est simulée physiquement sur un écran central.

---

## 📂 Structure du projet

```
p5play_brawler_example/
├── server.js          ← Serveur Node.js (HTTP + WebSocket)
├── package.json       ← Dépendances npm
├── lancer-le-serveur.bat  ← Lancement sous Windows
└── public/
    ├── game.html      ← Jeu affiché sur le grand écran
    └── controller.html ← Manette sur téléphone
```

---

## 🚀 Lancer le projet

### Prérequis
- [Node.js](https://nodejs.org/) installé (v16 ou plus récent)

### Étapes
1. Ouvrir un terminal dans ce dossier
2. Installer les dépendances (une seule fois) :
   ```bash
   npm install
   ```
3. Démarrer le serveur :
   ```bash
   node server.js
   ```
4. Ouvrir **game.html** sur le grand écran :  
   → http://localhost:3000/
5. Ouvrir **controller.html** sur chaque téléphone :  
   → http://[IP-de-votre-machine]:3000/controller

> 💡 Sous Windows : double-cliquer sur `lancer-le-serveur.bat`

---

## 🏗️ Architecture générale

```
┌─────────────────────────────────────────────────────┐
│                   SERVEUR Node.js                   │
│   Express (HTTP) + WebSocket (ws)                   │
│                                                     │
│   - Sert les fichiers HTML                          │
│   - Relaie les messages entre les clients           │
└────────────┬───────────────────────┬────────────────┘
             │                       │
             ▼                       ▼
   ┌─────────────────┐     ┌──────────────────────┐
   │   game.html     │     │  controller.html      │
   │  (grand écran)  │     │  (téléphone joueur)   │
   │                 │     │                        │
   │  p5play         │     │  Boutons :             │
   │  - physique     │     │  Spawn / Dash /        │
   │  - rendu 2D     │     │  Reverse               │
   └─────────────────┘     └──────────────────────┘
```

**Flux d'un message** (exemple : joueur appuie sur DASH) :
```
Téléphone                Serveur                Grand écran
    │── { type:'input1',    ──▶│                        │
    │    pseudo:'Alice' }      │── (broadcast) ────────▶│
    │                          │              reçoit message
    │                          │              → dashPlayer('Alice')
```

---

## 📡 Protocole WebSocket – Messages échangés

Tous les messages sont au format **JSON** :

| Message | Envoyé par | Champs | Effet sur le jeu |
|---------|------------|--------|-----------------|
| `spawn` | Controller | `{ type, pseudo }` | Crée une balle pour ce joueur |
| `input1` | Controller | `{ type, pseudo }` | Dash (impulsion dans la direction du marqueur) |
| `input2` | Controller | `{ type, pseudo }` | Inverse la rotation du marqueur |

---

## 🎮 Mécaniques de jeu

### La balle
- Sphère avec physique réaliste (gravité, rebond, friction)
- Créée par p5play, simulée par le moteur physique **planck.js** (port JavaScript de Box2D)

### Le marqueur directionnel
- Flèche qui tourne en permanence autour de la balle
- Indique la direction du prochain dash
- Grandit progressivement si le joueur est inactif (avertissement visuel)

### Actions
- **DASH** : Propulse la balle dans la direction du marqueur
- **REVERSE** : Inverse le sens de rotation du marqueur (pour changer de direction)

### Score
- +1 point toutes les 2 secondes de survie
- Si la balle tombe dans la zone rouge → destruction du joueur

---

## 📚 Concepts techniques illustrés

### 1. WebSocket vs HTTP
- **HTTP** : le client demande → le serveur répond → connexion fermée
- **WebSocket** : connexion persistante bidirectionnelle → le serveur peut envoyer des données à tout moment

### 2. Architecture "relay server"
- Le serveur ne connaît pas les règles du jeu
- Il reçoit un message → le redirige vers tous les autres clients
- La logique du jeu est entièrement dans `game.html`

### 3. p5play et la physique
- `new Sprite(x, y, taille, 'dynamic')` → crée un objet physique
- `world.gravity.y = 10` → gravité vers le bas
- `sprite.vel.x += force` → impulsion (dash)
- `sprite.bounciness = 0.6` → coefficient de rebond

### 4. La boucle de rendu
```
setup()  → exécuté une seule fois au démarrage
draw()   → exécuté en boucle (~60 fois/seconde)
```

---

## 🧩 Pour aller plus loin

- **Ajouter une collision entre joueurs** : détecter `sprite.overlaps(autreSprite)`
- **Ajouter un chat** : envoyer `{ type: 'chat', pseudo, message }` et l'afficher
- **Déployer en ligne** : utiliser [Railway](https://railway.app) ou [Render](https://render.com)
- **Ajouter des power-ups** : sprites statiques que l'on peut toucher
- **Changer la gravité** : `world.gravity.y = -5` pour une gravité inverse

---

## 🛠️ Dépendances

| Package | Rôle |
|---------|------|
| `express` | Serveur HTTP pour servir les fichiers HTML |
| `ws` | Protocole WebSocket côté serveur |
| `p5.js` (CDN) | Dessin 2D et boucle de jeu |
| `planck.js` (CDN) | Moteur physique (Box2D) |
| `p5play` (CDN) | Surcouche de p5.js pour la physique et les sprites |
