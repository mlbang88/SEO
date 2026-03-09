/**
 * ============================================================
 * GUIDE SETUP N8N — ÉTAPE PAR ÉTAPE
 * ============================================================
 */

// ============================================================
// ÉTAPE 1 : PRÉPARER LES CLÉS API
// ============================================================

/*
Tu as besoin de 3 clés :

1. CLAUDE_API_KEY
   - Va sur console.anthropic.com
   - Vog sur API Keys
   - Copie la clé qui commence par : sk-ant-api03-...
   - À remplacer dans : `const CLAUDE_API_KEY = '...'`

2. BREVO_API_KEY
   - Va sur brevo.com
   - Connexion → Paramètres → Clés API
   - Crée une nouvelle clé ou copie la clé existante
   - À remplacer dans : `const BREVO_API_KEY = '...'`

3. FIREBASE_PRIVATE_KEY
   - Tu l'as déjà téléchargée : seo-description-fiverr-0a707845676e.json
   - Ouvre ce fichier dans un éditeur texte
   - Cherche la ligne : "private_key": "-----BEGIN PRIVATE KEY-----\n..."
   - Copie TOUT le contenu entre les guillemets (y compris les \n)
   - À remplacer dans : `const FIREBASE_PRIVATE_KEY = '...'`
   
   IMPORTANT : Cette clé privée NE DOIT JAMAIS être partagée publiquement.
   Après avoir testé le workflow, tu dois révoquer cette clé :
   - Firebase → Compte de service → Clés → Clic droit → Supprimer

4. APP_URL
   - Eventually ton URL Vercel une fois le site déployé
   - Pour l'instant : https://seo-products-seven.vercel.app
   - À remplacer dans : `const APP_URL = '...'`
*/

// ============================================================
// ÉTAPE 2 : CRÉER LES DEUX WORKFLOWS DANS N8N
// ============================================================

/*
WORKFLOW 1 — Génération initiale

1. Ouvre ton N8N sur Railway
2. Clique "New Workflow"
3. Ajoute 3 noeuds :
   a. Noeud 1 — Webhook
   b. Noeud 2 — Code
   c. Noeud 3 — Respond to Webhook
4. Connecte Webhook → Code → Respond to Webhook en tirant des flèches

5. Configure le Webhook :
   - Path: descriptions-produits
   - Response mode: Using Respond to Webhook Node

6. Configure le Code :
   - Language: JavaScript
   - Colle tout le code du fichier N8N_WORKFLOW_1_GENERATION.js
   - Remplace les 4 constantes en haut du fichier

7. Configure Respond to Webhook :
   - Cherche "Specify Response Body"
   - Choisis "JSON"
   - Colle : {"success": true, "message": "Your order is being processed. Check your email for the preview link."}

8. Test avec "Execute workflow"
   - Si ça passe au vert → Clique "Publish" pour activer

---

WORKFLOW 2 — Révision

1. Clique "New Workflow"
2. Ajoute 3 noeuds :
   a. Noeud 1 — Webhook
   b. Noeud 2 — Code
   c. Noeud 3 — Respond to Webhook
3. Connecte les mêmes flèches

4. Configure le Webhook :
   - Path: revision
   - Response mode: Using Respond to Webhook Node

5. Configure le Code :
   - Language: JavaScript
   - Colle tout le code du fichier N8N_WORKFLOW_2_REVISION.js
   - Remplace les 4 constantes identiques

6. Configure Respond to Webhook :
   - JSON : {"success": true, "message": "Revision processed successfully"}

7. Publie le workflow
*/

// ============================================================
// ÉTAPE 3 : FLUX COMPLET DE TEST
// ============================================================

/*
Une fois les 2 workflows créés et publiés, voici comment tester le flux complet :

ÉTAPE 1 — Submit du formulaire
- Utilisateur remplit le formulaire React
- Clique "Submit"
- Payload sent to Webhook 1 (descriptions-produits)

ÉTAPE 2 — Génération + Firebase + Email
Webhook 1 fait :
  - Valide les données
  - Appelle Claude pour chaque produit → génère descriptions
  - Génère token JWT Firebase
  - Sauvegarde dans Firestore avec orderId, résultats, config
  - Envoie email avec lien de révision : https://app.com.vercel.app?revision={orderId}

Tu reçois l'email avec :
  - Les détails de la commande Fiverr
  - Le lien de révision à envoyer au client

ÉTAPE 3 — Client clique le lien
- Client clique : https://app.com.vercel.app?revision={orderId}
- React récupère orderId de l'URL
- Charge les descriptions depuis Firebase
- Affiche les descriptions + 2 boutons :
  ✅ "Looks good, generate my files"
  ✏️ "I want changes"

ÉTAPE 4A — Client valide (approbation)
- Client clique "Looks good"
- React POST to Webhook 2 : { orderId, action: "approve" }
- Webhook 2 fait :
  - Récupère données depuis Firebase
  - Génère CSV pour chaque plateforme
  - Génère HTML preview
  - Met à jour Firebase (status: "delivered")
  - T'envoie email avec TOUS les fichiers en pièces jointes
- TU reçois : email avec CSV + HTML prêt à livrer sur Fiverr

ÉTAPE 4B — Client demande révisions
- Client clique "I want changes"
- Rentre ses commentaires globaux + commentaires par produit
- React POST to Webhook 2 : { orderId, action: "revise", globalComment, productComments }
- Webhook 2 fait :
  - Récupère données depuis Firebase
  - Appelle Claude pour chaque produit avec les commentaires
  - Génère nouvelles descriptions
  - Met à jour Firebase (revisionsLeft: -1)
  - T'envoie email avec NOUVEAU lien de révision
- Tu retransmets le lien au client
- Boucle continue jusqu'à : 
  * Plus de révisions dispo (revisionsLeft === 0)
  * OU client valide (action: "approve")
*/

// ============================================================
// ÉTAPE 4 : LA CLÉ PRIVÉE FIREBASE EN DÉTAIL
// ============================================================

/*
La clé privée Firebase est LA clé critique. Elle ressemble à ça :

{
  "type": "service_account",
  "project_id": "seo-description-fiverr",
  "private_key_id": "0a707845676e...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXONxdL8/vn819\nOUa7O8YyLzQpwHOJCc4yAIQfvr4LDqFHNGbvCq...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@seo-description-fiverr.iam.gserviceaccount.com",
  ...
}

Ce qu'on extrait :
- private_key = la clé privée RSA
- client_email = firebase-adminsdk-fbsvc@...

Dans le code N8N, on utilise ces 2 champs pour :
1. Créer un JWT signé avec la clé privée
2. Le JWT identifie que c'est Firebase qui parle
3. JWT échangé contre un bearer token
4. Bearer token utilisé pour les appels à Firestore

Important : Les \n dans la clé privée doivent rester \n (pas de vrais retours à la ligne).
*/

// ============================================================
// ÉTAPE 5 : VÉRIFIER QUE FIREBASE EST CORRECTEMENT CONFIGURÉ
// ============================================================

/*
Avant de lancer les workflows, vérifie que Firestore est prêt :

1. Va sur Firebase Console
2. Seo-description-fiverr project
3. Firestore Database → Vérifier qu'elle existe
4. Crée une collection si elle n'existe pas :
   - Nom: "orders"
   - Document ID: Auto-generate (LaisseFire generate)
   - C'est tout, pas besoin de remplir manuellement

Les règles Firestore doivent permettre les opérations de lecture/écriture
depuis Firebase Admin SDK (ce qu'on utilise avec le service account).

Règles minimales :
match /databases/{database}/documents {
  match /{document=**} {
    allow read, write: if request.auth.uid != null;
  }
}

Ou plus sécurisé (service account seulement) :
match /databases/{database}/documents {
  match /{document=**} {
    allow read, write: if request.auth.uid != null 
      || request.auth.token.iss.matches('https://securetoken.google.com/seo-description-fiverr');
  }
}
*/

// ============================================================
// ÉTAPE 6 : TESTER WORKFLOW 1
// ============================================================

/*
Une fois le code du Workflow 1 collé et les clés remplacées :

1. Dans N8N, ouvre le Workflow 1
2. Clique sur le noeud Webhook
3. Clique "Listen for test event"
4. Envoie une requête PowerShell (voir exemple plus bas)
5. Si tout passe au vert → check ton email (maximelab888@gmail.com)
6. Tu devrais voir un email avec :
   - Détails de la commande
   - Lien de révision
   - MAIS PAS de pièces jointes (normal, c'est l'étape 1)

Si tu reçois l'email → Workflow 1 fonctionne ✅

Si tu ne reçois rien → Check les erreurs dans N8N en cliquant sur chaque noeud
*/

// ============================================================
// ÉTAPE 7 : TESTER WORKFLOW 2 (APPROUVER)
// ============================================================

/*
Une fois Workflow 1 fonctionnel et que tu as un orderId valide :

1. Dans l'email du Workflow 1, récupère l'orderId
   Exemple : "Order ID: my-fiverr-134556-1709999999999"

2. Ouvre le Workflow 2 dans N8N
3. Clique sur le noeud Webhook
4. Clique "Listen for test event"
5. Envoie cette requête PowerShell :

$orderId = "my-fiverr-134556-1709999999999"
$body = @{
    orderId = $orderId
    action = "approve"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://PRIMARY-PRODUCTION-94F2.up.railway.app/webhook/revision" \
  -Method POST \
  -ContentType "application/json" \
  -Body $body

6. Attend que le workflow termine
7. Check ton email → tu devrais recevoir LES FICHIERS CSV en pièces jointes ✅

Si ça marche → approver fonctionne !
*/

// ============================================================
// ÉTAPE 8 : TESTER WORKFLOW 2 (RÉVISER)
// ============================================================

/*
Test de révision :

$orderId = "my-fiverr-134556-1709999999999"
$body = @{
    orderId = $orderId
    action = "revise"
    globalComment = "Make the descriptions more casual and friendly"
    productComments = @{
        0 = "For this product, emphasize the comfort aspect more"
        1 = ""
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://PRIMARY-PRODUCTION-94F2.up.railway.app/webhook/revision" \
  -Method POST \
  -ContentType "application/json" \
  -Body $body

Tu reçois un email avec :
- Un nouveau lien de révision
- Révisions restantes réduites de 1

Le client clique ce nouveau lien → voit les descriptions révisées
*/

// ============================================================
// TROUBLESHOOTING
// ============================================================

/*
"JSON parameter needs to be valid JSON"
→ Les clés sont mal ou les guillemets sont échappés incorrectement
→ Vérifie que FIREBASE_PRIVATE_KEY a des \n (pas de vrais retours à ligne)

"Referenced node doesn't exist"
→ Tu as un problème de nom de noeud dans les appels $('NomDuNoeud')
→ Vérifie que tous les noms correspondent exactement

"Orders collection not found"
→ Firebase n'a pas la collection "orders"
→ Va dans Firestore et crée-la manuellement

"No more revisions available"
→ Le client a utilisé le nombre de révisions du package
→ Le workflow refuse de continuer

"Client email not in Brevo verified senders"
→ L'email "noreply@tondomaine.com" n'est pas vérifié
→ Remplace par un email personnel confirmé dans Brevo
*/

// ============================================================
// DÉPLOIEMENT EN PRODUCTION
// ============================================================

/*
Une fois que tout fonctionne :

1. Clique "Publish" sur Workflow 1
2. Clique "Publish" sur Workflow 2
3. Les webhooks passent de /webhook-test/ à /webhook/
4. Ils tournent 24h/24 en production
5. Ton React envoie aux URLs publiques

Copie ces URLs finales dans ton React :
- Webhook 1: https://primary-production-94f2.up.railway.app/webhook/descriptions-produits
- Webhook 2: https://primary-production-94f2.up.railway.app/webhook/revision
*/
