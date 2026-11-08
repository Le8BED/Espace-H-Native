import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Choisir un fichier (PDF, photo) ou prendre une photo avec l'appareil, au
// format attendu par l'extranet : { filename, contentType, data (base64) }.

export type FichierJoint = { filename: string; contentType: string; data: string; uri: string; taille?: number };
const MAX = 10 * 1024 * 1024;

export async function choisirDocument(types: string[] = ['application/pdf', 'image/jpeg', 'image/png']): Promise<FichierJoint | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  if (a.size && a.size > MAX) throw new Error('Fichier trop lourd (10 Mo maximum).');
  const data = await new File(a.uri).base64();
  return { filename: a.name || 'document.pdf', contentType: a.mimeType || 'application/pdf', data, uri: a.uri, taille: a.size };
}

export async function prendrePhoto(): Promise<FichierJoint | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Autorisez l’appareil photo dans les réglages du téléphone.');
  const r = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true, mediaTypes: ['images'] });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const data = a.base64 || (await new File(a.uri).base64());
  return { filename: `photo-${Date.now()}.jpg`, contentType: 'image/jpeg', data, uri: a.uri, taille: a.fileSize };
}

export async function choisirPhoto(): Promise<FichierJoint | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true, mediaTypes: ['images'] });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const data = a.base64 || (await new File(a.uri).base64());
  return { filename: a.fileName || `photo-${Date.now()}.jpg`, contentType: a.mimeType || 'image/jpeg', data, uri: a.uri, taille: a.fileSize };
}

// Pour un envoi multipart (FormData) : objet fichier React Native.
export const pourFormData = (f: FichierJoint) => ({ uri: f.uri, name: f.filename, type: f.contentType }) as unknown as Blob;
