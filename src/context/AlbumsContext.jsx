import { createContext, useContext, useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

const AlbumsContext = createContext();

export function AlbumsProvider({ children }) {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live-sync albums from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "albums"),
      (snap) => {
        setAlbums(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function addAlbum(albumData) {
    await addDoc(collection(db, "albums"), albumData);
  }

  async function updateAlbum(id, updates) {
    await updateDoc(doc(db, "albums", id), updates);
  }

  async function deleteAlbum(id) {
    await deleteDoc(doc(db, "albums", id));
  }

  return (
    <AlbumsContext.Provider value={{ albums, loading, error, addAlbum, updateAlbum, deleteAlbum }}>
      {children}
    </AlbumsContext.Provider>
  );
}

export function useAlbums() {
  return useContext(AlbumsContext);
}
