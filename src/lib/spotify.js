/**
 * Fetches album data from the Spotify API given a Spotify album URL.
 *
 * To get a token:
 * 1. Go to https://developer.spotify.com/dashboard and create an app
 * 2. Use the "Get Token" button or the Client Credentials flow
 * 3. Add the token to your .env file as VITE_SPOTIFY_TOKEN
 *
 * Note: Tokens expire after 1 hour. For a personal app, manually refreshing is fine.
 */
export async function fetchAlbumFromSpotify(spotifyUrl) {
  const token = import.meta.env.VITE_SPOTIFY_TOKEN;
  if (!token) throw new Error("Missing VITE_SPOTIFY_TOKEN in .env");

  // Extract album ID from URL like: https://open.spotify.com/album/4eLPsYPBmXABThSJ...
  const albumId = spotifyUrl.split("/album/")[1]?.split("?")[0];
  if (!albumId) throw new Error("Invalid Spotify album URL");

  const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} — token may be expired`);
  }

  const data = await res.json();

  return {
    spotifyId: data.id,
    name: data.name,
    artist: data.artists.map((a) => a.name).join(", "),
    year: new Date(data.release_date).getFullYear(),
    genre: data.genres ?? [],
    coverUrl: data.images[0]?.url ?? "",
    spotifyUrl: data.external_urls.spotify,
    tier: "C", // default tier — admin can change this
    notes: "",
    addedAt: new Date(),
  };
}
