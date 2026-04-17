# Configuration Production - Scan en Ligne

## 🔐 Étape 1: Configurer les Secrets Supabase

Allez sur: https://app.supabase.com > Votre projet > Settings > Edge Functions > Secrets

Ajoutez ce secret:

```
Name: ANTHROPIC_API_KEY
Value: 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
```

## 🚀 Étape 2: Déployer l'Edge Function

Depuis le terminal à la racine du projet:

```bash
# Connexion à Supabase (si première fois)
supabase login

# Déployer la fonction
supabase functions deploy identify-item --project-ref opktyoxabqxpnhasbipd

# Vérifier
supabase functions list --project-ref opktyoxabqxpnhasbipd
```

## ✅ Étape 3: Vérifier la Configuration Locale

Assurez-vous que `.env.local` contient:

```
EXPO_PUBLIC_SUPABASE_URL=https://opktyoxabqxpnhasbipd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_OWNER_BYPASS=false
```

## 🧪 Étape 4: Tester le Scan

1. Lancez l'app Expo:
   ```bash
   npm install
   npx expo start
   ```

2. Scannez le QR code avec Expo Go

3. Prenez une photo ou sélectionnez une image

4. Vérifiez que vous voyez:
   - ✅ L'historique du scan
   - ✅ La valeur estimée
   - ✅ L'état de l'objet
   - ✅ Les informations complètes

## 🐛 Dépannage

### Erreur "ANTHROPIC_API_KEY non configurée"
→ Allez sur le dashboard Supabase et ajoutez le secret

### Erreur "IMAGE_FETCH_403"
→ L'image téléchargée depuis Storage n'est pas accessible. Vérifiez les permissions du bucket `collectscan`

### Erreur "AI_INVALID_JSON"
→ Claude API renvoi un format inattexu. Attendez quelques minutes et réessayez.

---

Pour tout problème: Consultez les logs Edge Functions dans le dashboard Supabase > Logs
