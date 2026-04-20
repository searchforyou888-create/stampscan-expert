// Ce fichier sert à vérifier les variables d'environnement côté client
// Place ce fichier à la racine du projet et lance-le pour voir les variables accessibles

console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Pour React Native/Expo, tu peux aussi afficher dans un composant :
// import { Text } from 'react-native';
// export default function EnvDebug() {
//   return (
//     <>
//       <Text>SUPABASE_URL: {process.env.EXPO_PUBLIC_SUPABASE_URL}</Text>
//       <Text>SUPABASE_ANON_KEY: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}</Text>
//     </>
//   );
// }
