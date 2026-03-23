window._p5play_intro_image = '';

// =============================================================================
//  GAME.HTML – Affichage du jeu (grand écran)
// =============================================================================
//
//  Ce fichier reçoit les messages WebSocket et simule le jeu avec p5play.
//
//  Rôle de chaque partie :
//    - WebSocket   -> recevoir les commandes des téléphones
//    - p5play      -> simuler la physique et dessiner les balles
//    - Logique jeu -> gérer les joueurs, scores, marqueurs
//
//  Note sur p5.js :
//    p5.js fonctionne en mode "global" : les fonctions setup() et draw()
//    sont automatiquement appelées par p5.js. Pas besoin de les appeler manuellement.
//
// =============================================================================

// --- CONSTANTES DE JEU -------------------------------------------------------
// Toutes les valeurs configurables sont regroupées ici pour être faciles à modifier.

const GRAVITY = 10; // Force de gravité (unités p5play par seconde²)
const MARKER_DISTANCE = 35; // Distance du marqueur au centre de la balle (px)
const MARKER_ROTATION_SPEED = 2; // Vitesse de rotation du marqueur (radians/seconde)
const DASH_POWER = 6; // Force du dash (pixels/seconde ajoutés à la vitesse)
const SCORE_TICK_DELAY = 2000; // Délai entre chaque point de score (millisecondes)
const INACTIF_DELAY = 10; // Secondes d'inactivité avant que le marqueur grandisse
const MARKER_INIT_LENGTH = 15; // Longueur initiale du marqueur (pixels)
const MARKER_MAX_LENGTH = 40; // Longueur maximale du marqueur (pixels)
const MARKER_GROW_SPEED = 3; // Vitesse de croissance du marqueur (pixels/seconde)

// --- ÉTAT DU JEU -------------------------------------------------------------

// Dictionnaire des joueurs actifs.
// Clé = pseudo (string), Valeur = objet joueur (voir spawnPlayer)
// Exemple : players['Alice'] = { sprite, color, markerAngle, ... }
const players = {};

// Références aux sprites de l'arène (murs, sol, plafond)
// On les garde en variables pour pouvoir les repositionner si la fenêtre change de taille.
let ground, wallLeft, wallRight, ceiling, platform;

// Connexion WebSocket (sera initialisée dans setup())
let ws;

// =============================================================================
//  WEBSOCKET – Connexion et réception des messages
// =============================================================================

function connectWebSocket() {
  // Déterminer le protocole selon HTTPS ou HTTP
  // ws:// pour HTTP, wss:// pour HTTPS (obligatoire en production sécurisée)
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';

  // Se connecter au serveur WebSocket (même adresse que la page)
  ws = new WebSocket(`${protocol}//${location.host}`);

  // -- Connexion établie -----------------------------------------------------
  ws.onopen = () => {
    document.getElementById('connection-status').textContent = 'Connecté';
    document.getElementById('connection-status').className = 'connected';
    console.log('WebSocket connecté au serveur.');
  };

  // -- Connexion perdue ------------------------------------------------------
  ws.onclose = () => {
    document.getElementById('connection-status').textContent = 'Déconnecté';
    document.getElementById('connection-status').className = 'disconnected';
    // Tentative de reconnexion automatique toutes les 2 secondes.
    // Utile si le serveur redémarre sans recharger la page.
    setTimeout(connectWebSocket, 2000);
  };

  // -- Réception d'un message ------------------------------------------------
  ws.onmessage = (event) => {
    // Les messages sont en JSON. On parse pour obtenir un objet.
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return; // message invalide, on ignore
    }

    // Selon le type de message, on déclenche l'action correspondante
    if (msg.type === 'spawn') {
      // Un nouveau joueur veut rejoindre la partie
      spawnPlayer(msg.pseudo);
    } else if (msg.type === 'input1') {
      // Le joueur appuie sur DASH
      dashPlayer(msg.pseudo);
    } else if (msg.type === 'input2') {
      // Le joueur appuie sur REVERSE
      reversePlayer(msg.pseudo);
    }
  };
}

// =============================================================================
//  GESTION DES JOUEURS
// =============================================================================

/**
 * Crée un nouveau joueur avec :
 *   - un Sprite p5play (balle physique)
 *   - un marqueur directionnel (flèche tournante)
 *   - un compteur de score
 *
 * @param {string} pseudo - Le nom du joueur
 */
function spawnPlayer(pseudo) {
  // Éviter les doublons : si le joueur existe déjà, ne rien faire
  if (players[pseudo]) {
    console.log('Joueur déjà présent :', pseudo);
    return;
  }

  // Couleur aléatoire pour distinguer les joueurs visuellement
  // random(80, 255) pour éviter les couleurs trop sombres
  const col = color(random(80, 255), random(80, 255), random(80, 255));

  // --- Création du Sprite p5play ---------------------------------------------
  // new Sprite(x, y, taille, type)
  //   - x, y     : position initiale (aléatoire dans la zone de jeu)
  //   - 30       : diamètre en pixels (p5play crée automatiquement un collider circulaire)
  //   - 'dynamic': type physique -> affecté par la gravité et les forces
  //                (alternatives : 'static' pour les murs, 'kinematic' pour contrôle manuel)
  const ball = new Sprite(random(100, width - 100), random(100, 300), 30, 'dynamic');

  ball.bounciness = 0.6; // Coefficient de rebond (0 = pas de rebond, 1 = rebond parfait)
  ball.friction = 0.3; // Friction au sol (0 = glissant, 1 = très collant)
  ball.color = col;
  ball.stroke = color(255);
  ball.strokeWeight = 2;
  ball.mass = 1; // Masse (affecte la réponse aux forces)
  ball.rotationLock = true; // Empêche la rotation de la balle sur elle-même (visuel plus propre)

  // --- Données du joueur -----------------------------------------------------
  // On stocke toutes les données du joueur dans un objet
  const player = {
    pseudo: pseudo,
    sprite: ball,
    color: col,
    markerAngle: random(TWO_PI), // Direction initiale aléatoire (radians)
    markerRotationSpeed: MARKER_ROTATION_SPEED, // Vitesse de rotation (peut être négative = sens inverse)
    markerCurrentLength: MARKER_INIT_LENGTH, // Longueur actuelle du marqueur
    score: 0, // Score actuel
    scoreTimer: 0, // Accumulateur de temps pour le score
    lastInputTime: millis() / 1000, // Timestamp de la dernière action (en secondes)
    isActive: true // true = actif, false = inactif (marqueur grandit)
  };

  players[pseudo] = player;
  console.log('Joueur créé :', pseudo);
}

/**
 * Propulse la balle dans la direction du marqueur (DASH).
 * Équivalent de Rigidbody.AddForce() en Unity.
 *
 * @param {string} pseudo
 */
function dashPlayer(pseudo) {
  const p = players[pseudo];
  if (!p) return; // Joueur introuvable, ignorer

  // Calculer le vecteur direction à partir de l'angle du marqueur
  // cos(angle) = composante X, sin(angle) = composante Y
  const dx = cos(p.markerAngle);
  const dy = sin(p.markerAngle);

  // Ajouter une impulsion à la vitesse actuelle
  // sprite.vel = vitesse actuelle du sprite (vecteur {x, y})
  p.sprite.vel.x += dx * DASH_POWER;
  p.sprite.vel.y += dy * DASH_POWER;

  // Réinitialiser l'état d'inactivité
  p.isActive = true;
  p.lastInputTime = millis() / 1000;
  p.markerCurrentLength = MARKER_INIT_LENGTH;
}

/**
 * Inverse le sens de rotation du marqueur (REVERSE).
 * Permet de choisir une nouvelle direction de dash.
 *
 * @param {string} pseudo
 */
function reversePlayer(pseudo) {
  const p = players[pseudo];
  if (!p) return;

  // Multiplier la vitesse de rotation par -1 pour inverser le sens
  p.markerRotationSpeed *= -1;

  p.isActive = true;
  p.lastInputTime = millis() / 1000;
}

/**
 * Supprime un joueur et détruit son sprite physique.
 *
 * @param {string} pseudo
 */
function removePlayer(pseudo) {
  const p = players[pseudo];
  if (!p) return;

  // sprite.remove() supprime le sprite du moteur physique et de l'affichage
  p.sprite.remove();
  delete players[pseudo];
  console.log('Joueur supprimé :', pseudo);
}

// =============================================================================
//  TABLEAU DES SCORES
// =============================================================================

/**
 * Reconstruit le HTML du tableau des scores, trié par score décroissant.
 * Appelé toutes les 30 frames dans draw() pour ne pas surcharger le DOM.
 */
function updateScoreboard() {
  const list = Object.values(players)
    .map((p) => ({ pseudo: p.pseudo, score: p.score, col: p.color }))
    .sort((a, b) => b.score - a.score); // trier du plus grand au plus petit

  const el = document.getElementById('score-list');
  el.innerHTML = list
    .map(
      (e) =>
        `<div class="score-entry">
       <span style="color: rgb(${red(e.col)},${green(e.col)},${blue(e.col)})">${escapeHtml(e.pseudo)}</span>
       <span>${e.score}</span>
     </div>`
    )
    .join('');
}

/**
 * Sécurité : échappe les caractères HTML pour éviter les injections XSS.
 * Un pseudo malveillant comme "<script>..." sera affiché tel quel, pas exécuté.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// =============================================================================
//  P5.JS – SETUP (exécuté une seule fois au démarrage)
// =============================================================================

function setup() {
  // Créer le canvas plein écran
  // new Canvas() est la façon p5play de créer le canvas (remplace createCanvas())
  new Canvas(windowWidth, windowHeight);

  // Important ! p5play v3 utilise les DEGRÉS par défaut.
  // On passe en RADIANS car toute la trigonométrie (cos, sin, atan2) utilise des radians.
  angleMode(RADIANS);

  // Définir la gravité du monde physique
  // world.gravity.y = valeur positive -> gravité vers le bas
  world.gravity.y = GRAVITY;

  // --- Sprites statiques de l'arène -----------------------------------------
  // Les sprites 'static' n'ont pas de physique (ils ne bougent pas).
  // Ils servent de murs et de sol contre lesquels les balles rebondissent.

  // Sol invisible (légèrement en dessous de l'écran, sert de filet de sécurité)
  ground = new Sprite(width / 2, height + 20, width + 200, 40, 'static');
  ground.color = color(60);
  ground.visible = false; // invisible, on dessine la zone de destruction manuellement

  // Plateforme centrale visible
  platform = new Sprite(width / 2, height - 60, width * 0.7, 20, 'static');
  platform.color = color(80, 80, 80);
  platform.stroke = color(120);
  platform.strokeWeight = 2;
  platform.bounciness = 0.5;

  // Mur gauche
  wallLeft = new Sprite(-10, height / 2, 20, height + 200, 'static');
  wallLeft.color = color(60);

  // Mur droit
  wallRight = new Sprite(width + 10, height / 2, 20, height + 200, 'static');
  wallRight.color = color(60);

  // Plafond
  ceiling = new Sprite(width / 2, -10, width + 200, 20, 'static');
  ceiling.color = color(60);

  // Démarrer la connexion WebSocket
  connectWebSocket();
}

// =============================================================================
//  P5.JS – DRAW (exécuté en boucle, ~60 fois par seconde)
// =============================================================================
//
//  Ordre d'exécution à chaque frame :
//    1. background()   -> effacer l'écran
//    2. Dessiner le décor (arène, zone de destruction)
//    3. Pour chaque joueur : vérifier destruction, mettre à jour physique manuelle, dessiner
//    4. Mettre à jour le scoreboard (toutes les 30 frames)
//    5. p5play dessine automatiquement les sprites (allSprites.draw)
//
// =============================================================================

function draw() {
  // Effacer l'écran avec une couleur de fond sombre
  background(20, 20, 30);

  // --- Décor : contour de l'arène --------------------------------------------
  push(); // Sauvegarder les paramètres graphiques actuels
  noFill();
  stroke(60);
  strokeWeight(3);
  rect(0, 0, width, height - 60); // rectangle délimitant l'aire de jeu
  pop(); // Restaurer les paramètres graphiques

  // --- Décor : plateforme centrale -------------------------------------------
  push();
  fill(50);
  noStroke();
  rect(width * 0.15, height - 70, width * 0.7, 20, 5); // rect avec coins arrondis
  pop();

  // --- Décor : zone de destruction (bas de l'écran) ---------------------------
  push();
  fill(180, 30, 30, 80); // rouge semi-transparent
  noStroke();
  rect(0, height - 30, width, 30);
  fill(255, 60, 60);
  textAlign(CENTER, CENTER);
  textSize(12);
  text('ZONE DE DESTRUCTION', width / 2, height - 15);
  pop();

  // --- Temps courant (en secondes) pour les calculs de timing ----------------
  const currentTime = millis() / 1000;

  // deltaTime (fourni par p5.js) = temps écoulé depuis la dernière frame (en ms)
  // On le convertit en secondes pour les calculs de vitesse
  const dt = deltaTime / 1000;

  // --- Mise à jour et dessin de chaque joueur --------------------------------
  for (const pseudo in players) {
    const p = players[pseudo];

    // -- Vérification : la balle est-elle tombée dans la zone de destruction ? --
    // height - 25 correspond approximativement au bord de la zone rouge
    if (p.sprite.y > height - 25) {
      removePlayer(pseudo);
      continue; // passer au joueur suivant (le joueur vient d'être supprimé)
    }

    // -- Détection d'inactivité ------------------------------------------------
    // Si le joueur n'a pas interagi depuis INACTIF_DELAY secondes, le marquer inactif.
    // Conséquence : le marqueur grandit pour l'inciter à jouer.
    if (currentTime - p.lastInputTime > INACTIF_DELAY) {
      p.isActive = false;
    }

    // -- Rotation du marqueur --------------------------------------------------
    // On incrémente l'angle proportionnellement au temps écoulé (dt).
    // Cela assure une rotation fluide indépendante du framerate.
    p.markerAngle += p.markerRotationSpeed * dt;

    // -- Taille du marqueur ----------------------------------------------------
    if (!p.isActive) {
      // Grandir progressivement (avertissement visuel)
      if (p.markerCurrentLength < MARKER_MAX_LENGTH) {
        p.markerCurrentLength += MARKER_GROW_SPEED * dt;
      }
    } else {
      // Réinitialiser la taille si le joueur est actif
      p.markerCurrentLength = MARKER_INIT_LENGTH;
    }

    // -- Score -----------------------------------------------------------------
    // On accumule le temps écoulé et on ajoute +1 point toutes les SCORE_TICK_DELAY ms
    p.scoreTimer += deltaTime;
    if (p.scoreTimer >= SCORE_TICK_DELAY) {
      p.score += 1;
      p.scoreTimer = 0;
    }

    // -- Dessin : pseudo au-dessus de la balle ---------------------------------
    push();
    fill(255);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text(p.pseudo, p.sprite.x, p.sprite.y - 22);
    pop();

    // -- Dessin : marqueur directionnel ----------------------------------------
    // Le marqueur est une flèche partant de la balle, indiquant la direction du dash.
    //
    // Calcul des points :
    //   cos(angle) et sin(angle) donnent le vecteur unitaire dans la direction ANGLE
    //   On multiplie par une distance pour obtenir la position en pixels.
    push();

    // Point de départ de la flèche (sur le bord de la balle + MARKER_DISTANCE)
    const mx = p.sprite.x + cos(p.markerAngle) * MARKER_DISTANCE;
    const my = p.sprite.y + sin(p.markerAngle) * MARKER_DISTANCE;

    // Point d'arrivée de la flèche (encore plus loin dans la même direction)
    const endX = p.sprite.x + cos(p.markerAngle) * (MARKER_DISTANCE + p.markerCurrentLength);
    const endY = p.sprite.y + sin(p.markerAngle) * (MARKER_DISTANCE + p.markerCurrentLength);

    // Corps de la flèche (ligne)
    stroke(red(p.color), green(p.color), blue(p.color));
    strokeWeight(3);
    line(mx, my, endX, endY);

    // Tête de flèche (triangle)
    const arrowSize = 8;
    const arrowAngle = atan2(endY - my, endX - mx); // angle de la flèche
    fill(red(p.color), green(p.color), blue(p.color));
    noStroke();
    triangle(
      endX + cos(arrowAngle) * arrowSize,
      endY + sin(arrowAngle) * arrowSize,
      endX + cos(arrowAngle + 2.5) * arrowSize,
      endY + sin(arrowAngle + 2.5) * arrowSize,
      endX + cos(arrowAngle - 2.5) * arrowSize,
      endY + sin(arrowAngle - 2.5) * arrowSize
    );
    pop();
  }

  // --- Mise à jour du tableau des scores -------------------------------------
  // On ne met à jour que toutes les 30 frames (environ toutes les 0.5 secondes)
  // pour éviter de reconstruire le DOM trop souvent.
  if (frameCount % 30 === 0) {
    updateScoreboard();
  }

  // --- Afficher l'URL de la manette -----------------------------------------
  push();
  fill(100);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(13);
  text('Manette : ' + location.origin + '/controller', 10, height - 45);
  pop();
}

// =============================================================================
//  REDIMENSIONNEMENT DE LA FENÊTRE
// =============================================================================

// Appelé automatiquement par p5.js si la fenêtre change de taille
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Repositionner les sprites statiques selon les nouvelles dimensions
  // (sans ça, les murs restent aux anciennes positions)
  if (ground) {
    ground.x = width / 2;
    ground.y = height + 20;
  }
  if (wallRight) {
    wallRight.x = width + 10;
  }
  if (ceiling) {
    ceiling.x = width / 2;
  }
  if (platform) {
    platform.x = width / 2;
    platform.y = height - 60;
  }
}
