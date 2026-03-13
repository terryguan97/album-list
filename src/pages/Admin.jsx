import { useState } from "react";
import { useAlbums } from "../context/AlbumsContext";
import { fetchAlbumFromSpotify } from "../lib/spotify";
import AlbumCard from "../components/AlbumCard/AlbumCard";

const TIERS = ["S", "A", "B", "C", "D"];

export default function Admin() {
  const { albums, addAlbum, updateAlbum, deleteAlbum } = useAlbums();

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedTier, setSelectedTier] = useState("C");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(""); // feedback message
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    if (!spotifyUrl.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      const album = await fetchAlbumFromSpotify(spotifyUrl.trim());
      setPreview({ ...album, tier: selectedTier });
      setStatus("Album found! Review and save below.");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setLoading(true);
    try {
      await addAlbum({ ...preview, tier: selectedTier, notes });
      setStatus(`✓ "${preview.name}" added to the database!`);
      setPreview(null);
      setSpotifyUrl("");
      setNotes("");
      setSelectedTier("C");
    } catch (err) {
      setStatus(`Error saving: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteAlbum(id);
  }

  async function handleTierChange(id, newTier) {
    await updateAlbum(id, { tier: newTier });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
      <h2 className="text-2xl font-black text-white">Admin — Add Albums</h2>

      {/* Add by Spotify URL */}
      <section className="bg-gray-800 rounded-xl p-6 flex flex-col gap-4">
        <h3 className="font-bold text-gray-200">Add from Spotify URL</h3>

        <div className="flex gap-2">
          <input
            type="url"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/album/..."
            className="flex-1 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg
                       px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleFetch}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2
                       rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>

        {status && (
          <p className={`text-sm ${status.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {status}
          </p>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex gap-6 items-start">
            <AlbumCard album={{ ...preview, tier: selectedTier }} />

            <div className="flex flex-col gap-3 flex-1">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tier</label>
                <div className="flex gap-2">
                  {TIERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTier(t)}
                      className={`w-9 h-9 font-black rounded-lg text-sm transition-all
                        ${selectedTier === t
                          ? "bg-indigo-600 text-white scale-110"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Why do you love this album?"
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg
                             px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2
                           rounded-lg text-sm transition-colors disabled:opacity-50 self-start"
              >
                {loading ? "Saving..." : "Save to Database"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Manage existing albums */}
      <section>
        <h3 className="font-bold text-gray-200 mb-4">Manage Existing Albums ({albums.length})</h3>
        <div className="flex flex-col gap-2">
          {albums.map((album) => (
            <div
              key={album.id}
              className="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-3"
            >
              <img src={album.coverUrl} alt={album.name} className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-100 truncate">{album.name}</p>
                <p className="text-xs text-gray-400 truncate">{album.artist} · {album.year}</p>
              </div>

              {/* Quick tier change */}
              <select
                value={album.tier}
                onChange={(e) => handleTierChange(album.id, e.target.value)}
                className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 text-xs"
              >
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <button
                onClick={() => handleDelete(album.id, album.name)}
                className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
