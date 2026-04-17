# Expo React Native Template

This is a React Native template using Expo Router and configured for web, iOS, and Android development.

## Quick Start

```bash
# Fast installation with Bun (recommended)
bun install

# Or use npm (slower but more stable)
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Available Commands

### Development
- `npm run dev` - Start development server for web on port 3000
- `npm start` - Start development server (shows QR code for mobile)
- `npm run start:web` - Start web development server
- `npm run start:ios` - Start iOS development server
- `npm run start:android` - Start Android development server

### Building
- `npm run build:web` - Build for web production
- `npm run build:ios` - Build for iOS
- `npm run build:android` - Build for Android

### Package Management (Bun - Fast)
- `bun install` - Install dependencies (fastest)
- `npm run install:fast` - Install with Bun, skip postinstall (very fast)
- `npm run add <package>` - Add package with Bun
- `npm run setup` - Run Expo install for native linking

### Package Management (npm - Stable)
- `npm install` - Install dependencies (slower but stable)
- `npm run setup` - Run Expo install for native linking

### Utilities
- `npm run doctor` - Check project setup and dependencies
- `npm run upgrade` - Upgrade Expo SDK and dependencies
- `npm run lint` - Run linting
- `npm run eject` - Eject from Expo (use with caution)

## Project Structure

```
├── app/                 # Expo Router pages
├── components/          # Reusable components
├── assets/             # Images, fonts, etc.
├── hooks/              # Custom hooks
└── package.json        # Dependencies and scripts
```

## Performance Tips

### For fastest installation:
1. Use `bun install` (2-10x faster than npm)
2. Use `npm run install:fast` to skip postinstall steps
3. Only run `npm run setup` when you need native linking

### For most stable installation:
1. Use `npm install` (slower but more compatible)
2. Run `npm run setup` after installing new native dependencies

## Notes for AI Agents

- **Fast setup**: Use `bun install` then `npm run dev`
- **Stable setup**: Use `npm install` then `npm run dev`
- Use `npm run doctor` to diagnose issues
- Use `npm run setup` instead of `npm run install` for Expo packages
- The project uses Expo Router for navigation
- Web version runs on port 3000 by default
- Bun is 2-10x faster than npm for package installation 

## RevenueCat Setup

Ajoutez vos cles SDK publiques RevenueCat dans votre environnement local avant de tester les abonnements.

Variables supportees :

- `EXPO_PUBLIC_REVENUECAT_API_KEY` : cle generale si vous utilisez une seule plateforme
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` : cle SDK iOS
- `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` : cle SDK Android
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` : cle SDK Web

Exemple :

```bash
EXPO_PUBLIC_REVENUECAT_WEB_API_KEY=rcb_xxxxx
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=appl_xxxxx
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=goog_xxxxx
```

Le hook paiements charge uniquement les offerings actives configurees dans RevenueCat. Si aucune offre n apparait dans l application, verifiez :

- qu une offering courante existe dans le dashboard RevenueCat
- qu au moins un package y est attache
- que l entitlement `premium` est bien lie a ces produits

## Supabase Setup

L application utilise deja Supabase pour :

- l authentification email / mot de passe
- la connexion Google
- la sauvegarde des objets scannes dans `collection_items`
- les demandes de verification humaine
- l assistant d etat guide

### 1. Creer le projet Supabase

Dans le dashboard Supabase :

1. Cree un nouveau projet
2. Recupere dans Settings -> API :
	- Project URL
	- Publishable key / anon key

### 2. Configurer les variables d environnement

Copie [/.env.example](.env.example) en `.env.local` puis renseigne au minimum :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ta_cle_publishable_supabase
```

Au lancement, [lib/supabase.ts](lib/supabase.ts) bloquera maintenant avec un message clair si une de ces variables manque.

### 3. Executer les migrations SQL

Dans le SQL Editor Supabase, execute ces migrations dans cet ordre :

1. [supabase/migrations/20260413000001_collection_items.sql](supabase/migrations/20260413000001_collection_items.sql)
2. [supabase/migrations/20260413000002_catalogue_items.sql](supabase/migrations/20260413000002_catalogue_items.sql)
3. [supabase/migrations/20260413120000_bypass_mode.sql](supabase/migrations/20260413120000_bypass_mode.sql) si tu utilises `EXPO_PUBLIC_OWNER_BYPASS=true`
4. [supabase/migrations/20260413133000_expert_verification.sql](supabase/migrations/20260413133000_expert_verification.sql)
5. [supabase/migrations/20260413143000_guided_condition.sql](supabase/migrations/20260413143000_guided_condition.sql)
6. [supabase/migrations/20260414110000_collectscan_storage.sql](supabase/migrations/20260414110000_collectscan_storage.sql)
7. [supabase/migrations/20260414113000_collectscan_storage_private.sql](supabase/migrations/20260414113000_collectscan_storage_private.sql)

Si tu utilises la CLI Supabase, tu peux aussi lier le projet puis pousser les migrations.

### 3bis. Configurer le bucket Storage pour les scans

Le hook [hooks/useAIAnalysis.ts](hooks/useAIAnalysis.ts) envoie chaque image dans le bucket `collectscan` avant d appeler l IA.

Les migrations [supabase/migrations/20260414110000_collectscan_storage.sql](supabase/migrations/20260414110000_collectscan_storage.sql) puis [supabase/migrations/20260414113000_collectscan_storage_private.sql](supabase/migrations/20260414113000_collectscan_storage_private.sql) configurent automatiquement :

- le bucket `collectscan`
- son passage en mode prive
- les policies de lecture, insertion, mise a jour et suppression sur `storage.objects` pour les utilisateurs authentifies
- l usage d URLs signees a la place d URLs publiques persistantes

Important : en mode prive, l upload des images demande une vraie session Supabase. Le mode `EXPO_PUBLIC_OWNER_BYPASS=true` n est donc plus adapte a la production si tu gardes le bucket prive.

Recommandation : garde le mode proprietaire pour le local / dev prive uniquement. Pour tes clients en production, laisse `EXPO_PUBLIC_OWNER_BYPASS=false` afin qu ils utilisent toujours une vraie authentification Supabase.

### 3ter. Configurer la fonction Edge identify-item

L application appelle actuellement la fonction [supabase/functions/identify-item/index.ts](supabase/functions/identify-item/index.ts) via [hooks/useAIAnalysis.ts](hooks/useAIAnalysis.ts#L237). C est donc cette fonction qu il faut deployer en priorite.

Le secret serveur requis est `ANTHROPIC_API_KEY`.

Exemple avec la CLI Supabase :

```bash
supabase link --project-ref ton-project-ref
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase functions deploy identify-item
```

Tu peux ensuite tester la fonction avec :

```bash
supabase functions serve identify-item --env-file .env
```

Le dossier [supabase/functions/analyze/index.ts](supabase/functions/analyze/index.ts) existe aussi dans le repo, mais le client mobile/web utilise aujourd hui `identify-item`.

### 4. Configurer Authentication

Dans Supabase -> Authentication :

1. Active Email
2. Active Google si tu veux le bouton Google
3. Ajoute les Redirect URLs autorisees

Pour le web local, ajoute au minimum :

```text
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:8081
http://localhost:8081/auth/callback
```

Si tu testes dans Codespaces ou sur un domaine Expo web, ajoute aussi l URL exacte utilisee par ton app.

Pour les tests mobiles avec lien email, ajoute aussi l URL de callback retour de l app. Exemples :

```text
blinkexpo://auth/callback
exp://ADRESSE-DE-DEV/auth/callback
exp://ADRESSE-DE-DEV/--/auth/callback
```

En developpement, l URL exacte depend du mode Expo utilise. Le plus fiable est de reprendre la valeur generee par `Linking.createURL('/auth/callback')` dans l app en cours d execution.

### 5. Verification des policies RLS

La table `collection_items` est protegee par RLS et chaque utilisateur ne voit que ses propres objets.

Le hook [hooks/useSupabaseCollection.ts](hooks/useSupabaseCollection.ts) filtre deja sur `user_id`, et les policies SQL imposent aussi cette regle cote base.

### 6. Tester l integration

1. Lance l app avec `npm run dev` ou `npm start`
2. Cree un compte ou connecte-toi
3. Fais un scan
4. Verifie qu un enregistrement apparait dans `public.collection_items`
5. Ouvre la collection dans l app pour confirmer la lecture depuis Supabase

### 7. Points d attention

- N utilise jamais la service role key dans l app Expo
- Utilise uniquement la publishable / anon key cote client
- N utilise pas `EXPO_PUBLIC_ANTHROPIC_API_KEY` en production, car cette variable est exposee cote client
- Garde `ANTHROPIC_API_KEY` uniquement dans les secrets serveur Supabase ou dans ton proxy local
- Si les estimations echouent des le debut, verifie d abord que le bucket `collectscan` existe bien et que ta session Supabase est active
- Si l upload marche mais pas l estimation, verifie que la fonction `identify-item` est bien deployee et que `ANTHROPIC_API_KEY` est defini
- Si tu veux garder un bucket prive, n utilise pas le mode bypass sans authentification pour les scans
- Si Google echoue, verifie les providers et les redirect URLs
- Si la sauvegarde echoue apres les derniers ajouts, verifie que les deux migrations recentes ont bien ete appliquees