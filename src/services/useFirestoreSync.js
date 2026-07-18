import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Hook customizado para sincronizar um estado local com um documento no Firestore.
 * @param {string} docId ID do documento na coleção 'geoData'
 * @param {any} defaultValue Valor padrão inicial
 */
export function useFirestoreSync(docId, defaultValue) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'geoData', docId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().value);
      } else {
        // Se o doc não existe no Firestore, cria com o valor padrão
        setDoc(docRef, { value: defaultValue });
        setData(defaultValue);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao sincronizar ${docId}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docId]); // Removemos defaultValue das dependências para não causar loops se for array/obj

  // Função para salvar novos dados
  const saveData = async (newValue) => {
    // Atualiza localmente para resposta rápida (optimistic UI)
    setData(newValue);
    // Salva no Firestore
    const docRef = doc(db, 'geoData', docId);
    try {
      await setDoc(docRef, { value: newValue });
    } catch (error) {
      console.error(`Erro ao salvar ${docId}:`, error);
    }
  };

  return [data, saveData, loading];
}
