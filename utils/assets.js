// Absolute URLs, so they resolve the same from the dashboard and from every
// component or overlay page, whatever folder the importing page lives in.
const HERO_ICON_PATH = new URL('../assets/heroes_images/', import.meta.url).href;
const ROLES_ICON_PATH = new URL('../assets/roles_icons/', import.meta.url).href;

export const heroIconUrl = (hero) => HERO_ICON_PATH + hero.image;
export const roleIconUrl = (role) => `${ROLES_ICON_PATH}Role_${role}_Circle.svg`;
