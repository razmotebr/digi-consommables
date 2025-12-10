// Données partagées pour les prix et le mapping client -> enseigne.
import intermarche from "./prices_data/intermarche.json";
import carrefour from "./prices_data/carrefour.json";

export const CLIENT_ENSEIGNE = {
  C001: "Intermarche",
  C002: "Carrefour",
};

export const ENSEIGNE_PRICES = {
  Intermarche: intermarche,
  Carrefour: carrefour,
};
