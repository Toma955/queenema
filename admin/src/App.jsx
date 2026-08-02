/**
 * Admin Vercel sada služi isti client (puni Ema UI + admin kontrole).
 * Deploy: iz folderа client/ na projekt queenema-admin.
 * Cookies se traže samo na queenema.art (korisnik).
 */
export default function App() {
  if (typeof window !== "undefined") {
    // Ako netko još deploya ovaj folder, pošalji na admin production client.
    window.location.replace("https://queenema-admin.vercel.app");
  }
  return null;
}
