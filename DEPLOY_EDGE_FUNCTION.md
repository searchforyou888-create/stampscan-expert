# 🚀 Déployer l'Edge Function Manuellement

## Option 1: Via Dashboard Supabase (Recommandé - Facile)

### Étape 1: Copier le code de la fonction

Allez à: `/workspaces/stampscan-expert/supabase/functions/identify-item/index.ts`

Sélectionnez-le tout (Ctrl+A):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { ... };
// [tout le contenu du fichier]
```

### Étape 2: Créer/modifier la fonction dans Supabase

1. Allez à: **https://app.supabase.com**
2. Connectez-vous à votre projet
3. Allez à: **Functions** (menu latéral)
4. Cliquez: **Create a new function** (ou éditer `identify-item` si elle existe)
5. Collez tout le code du fichier TypeScript
6. Cliquez: **Deploy**

### Étape 3: Ajouter le Secret ANTHROPIC_API_KEY

1. Allez à: **Settings > Edge Functions > Secrets**
2. Cliquez: **New Secret**
3. Remplissez:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `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`
4. Cliquez: **Save**

---

## Option 2: Via CLI (Nécessite authentification)

Si vous avez une clé d'API Supabase avec permissions de déploiement:

```bash
# Ajouter le token
export SUPABASE_ACCESS_TOKEN="your_token_here"

# Déployer
supabase functions deploy identify-item --project-ref opktyoxabqxpnhasbipd
```

---

## Vérifier le Déploiement

Pour confirmer que la fonction est déployée correctement, testez-la:

```bash
curl -X POST https://opktyoxabqxpnhasbipd.supabase.co/functions/v1/identify-item \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8" \
  -d '{"imageUrl":"https://example.com/image.jpg","type":"stamp"}'
```

**Réponse attendue:**
- ❌ Si erreur de secret: `{"error":"ANTHROPIC_API_KEY non configurée"}`
- ✅ Si succès: `{"success":true,"result":{...}}`

---

## ✅ Checklist Déploiement

- [ ] Code de la fonction copié et collé dans le dashboard
- [ ] Fonction créée/modifiée avec nom `identify-item`
- [ ] Cliquez "Deploy"
- [ ] Secret `ANTHROPIC_API_KEY` ajouté dans Settings > Edge Functions > Secrets
- [ ] Teste que la fonction répond à un appel POST

Une fois déployée, le scan fonctionne immédiatement! 🎉
